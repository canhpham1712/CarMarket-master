import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import OpenAI from 'openai';
import { ListingDetail } from '../../../entities/listing-detail.entity';
// Removed unused imports: CarMetadata, CarMake, CarModel
import {
  UserIntent,
  AssistantResponseDto,
  SuggestionChip,
  MessageAction,
} from '../dto/assistant-response.dto';
import { QueryExtractionService } from './query-extraction.service';
import { ListingQueryBuilderService } from './listing-query-builder.service';
import { UserContextService } from './user-context.service';
import { CarComparisonService } from './car-comparison.service';
import { FAQRAGService } from './faq-rag.service';
import { MetadataService } from '../../metadata/metadata.service';
import { User } from '../../../entities/user.entity';

@Injectable()
export class ResponseHandlerService {
  private readonly logger = new Logger(ResponseHandlerService.name);
  private openai: OpenAI;

  constructor(
    @InjectRepository(ListingDetail)
    private readonly listingRepository: Repository<ListingDetail>,
    private readonly queryExtractionService: QueryExtractionService,
    private readonly listingQueryBuilderService: ListingQueryBuilderService,
    private readonly userContextService: UserContextService,
    private readonly carComparisonService: CarComparisonService,
    private readonly faqRAGService: FAQRAGService,
    private readonly metadataService: MetadataService,
  ) {
    const apiKey = process.env.OPENAI_API_KEY;
    this.openai = new OpenAI({
      apiKey: apiKey || 'dummy-key',
    });
  }

  async handleIntent(
    intent: UserIntent,
    userQuery: string,
    extractedEntities: any,
    currentUser?: User,
  ): Promise<AssistantResponseDto> {
    switch (intent) {
      case UserIntent.CAR_SPECS:
        return this.handleCarSpecs(userQuery, extractedEntities);
      case UserIntent.CAR_LISTING:
        return this.handleCarListing(userQuery, extractedEntities);
      case UserIntent.FAQ:
        return this.handleFAQ(userQuery);
      case UserIntent.CAR_COMPARE:
        return this.handleCarCompare(userQuery, extractedEntities);
      case UserIntent.USER_INFO:
        return this.handleUserInfo(userQuery, currentUser);
      case UserIntent.CAR_VALUATION:
        return this.handleCarValuation();
      default:
        return this.handleFAQ(userQuery);
    }
  }

  private async handleCarSpecs(
    userQuery: string,
    _extractedEntities: any,
  ): Promise<AssistantResponseDto> {
    try {
      // Get car details for context (from listings)
      const listings = await this.listingRepository.find({
        take: 100,
        relations: ['carDetail'],
      });

      // Build context from available car details
      const cars = listings
        .map((l) => l.carDetail)
        .filter((c) => !!c);

      const metadataContext = cars
        .map(
          (c) =>
            `${c.make} ${c.model} (${c.year}): ${c.bodyType}, ${c.fuelType}, ${c.transmission}`,
        )
        .join('\n');

      const systemPrompt = `You are a knowledgeable car expert assistant for a car marketplace.
The user is asking about car specifications or features.

Available car information in our database:
${metadataContext.substring(0, 2000)}

Provide detailed, accurate information about the car specifications requested.
If the specific car is not in our database, provide general knowledge about that car model.
Be conversational and helpful.`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userQuery },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const message = completion.choices[0]?.message?.content || 
        "I'd be happy to help you with car specifications. Could you please specify which car model you're interested in?";

      const suggestions: SuggestionChip[] = [
        {
          id: '1',
          label: 'View available cars',
          query: 'What cars do you have available?',
          icon: '🚗',
        },
        {
          id: '2',
          label: 'Compare cars',
          query: 'Compare two cars',
          icon: '⚖️',
        },
      ];

      return {
        intent: UserIntent.CAR_SPECS,
        message,
        suggestions,
      };
    } catch (error) {
      this.logger.error('Error handling car specs:', error);
      return {
        intent: UserIntent.CAR_SPECS,
        message:
          "I'm having trouble fetching car specifications right now. Please try again or contact our support team.",
        suggestions: [],
      };
    }
  }

  private async handleCarListing(
    userQuery: string,
    _extractedEntities: any,
  ): Promise<AssistantResponseDto> {
    try {
      this.logger.log(`Processing car_listing query: "${userQuery}"`);

      // Step 1: Extract structured query parameters using LLM
      const extractedParams =
        await this.queryExtractionService.extractQueryParameters(userQuery);

      this.logger.log(
        `Extraction confidence: ${extractedParams.confidence}, ` +
          `Keywords: ${extractedParams.extractedKeywords.join(', ')}`,
      );

      // Step 2: Build and execute database query
      const { listings, totalCount } =
        await this.listingQueryBuilderService.buildAndExecuteQuery(
          extractedParams,
        );

      // Step 3: Generate natural language response using LLM
      const message = await this.generateListingResponseMessage(
        userQuery,
        listings,
        totalCount,
        extractedParams,
      );

      // Step 4: Create action buttons for each listing
      const actions: MessageAction[] = listings.slice(0, 5).map((listing) => ({
        label: `View ${listing.carDetail.year} ${listing.carDetail.make} ${listing.carDetail.model}`,
        action: 'view_listing',
        data: { listingId: listing.id },
      }));

      // Step 5: Generate contextual suggestions based on results
      const suggestions = this.generateContextualSuggestions(
        listings,
        extractedParams,
        totalCount,
      );

      return {
        intent: UserIntent.CAR_LISTING,
        message,
        data: {
          listings: listings.slice(0, 5), // Send top 5 for display
          totalCount,
          appliedFilters: this.getAppliedFiltersDescription(extractedParams),
          queryStats: this.listingQueryBuilderService.getQueryStats(extractedParams),
        },
        suggestions,
        actions,
      };
    } catch (error) {
      this.logger.error('Error handling car listing:', error);
      return {
        intent: UserIntent.CAR_LISTING,
        message:
          "I'm having trouble accessing our inventory right now. Please try again or browse our listings page.",
        suggestions: [
          {
            id: '1',
            label: 'View all cars',
            query: 'Show me all available cars',
            icon: '🚗',
          },
        ],
      };
    }
  }

  /**
   * Generate natural language response message using LLM
   */
  private async generateListingResponseMessage(
    userQuery: string,
    listings: ListingDetail[],
    totalCount: number,
    extractedParams: any,
  ): Promise<string> {
    try {
      // Build listing summary for LLM context
      const listingSummary = listings.slice(0, 5).map((listing) => {
        const car = listing.carDetail;
        return {
          make: car.make,
          model: car.model,
          year: car.year,
          price: listing.price,
          mileage: car.mileage,
          bodyType: car.bodyType,
          fuelType: car.fuelType,
          transmission: car.transmission,
          condition: car.condition,
          location: listing.city || listing.location,
        };
      });

      const systemPrompt = `You are a helpful car marketplace assistant.
Generate a natural, conversational response about available car listings.

Guidelines:
1. Be enthusiastic and helpful
2. Highlight key details (price, year, mileage, features)
3. If multiple results, mention the total count
4. If no results, suggest alternatives politely
5. Keep response concise (3-5 sentences)
6. Use natural language, not bullet points
7. Mention if there are more results beyond what's shown`;

      const userPrompt = `User query: "${userQuery}"

Found ${totalCount} total listings. Here are the top ${listings.length}:

${JSON.stringify(listingSummary, null, 2)}

Applied filters: ${this.getAppliedFiltersDescription(extractedParams)}

Generate a friendly response summarizing these results.`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 300,
      });

      return (
        completion.choices[0]?.message?.content ||
        this.generateFallbackMessage(listings, totalCount)
      );
    } catch (error) {
      this.logger.error('Error generating LLM response:', error);
      return this.generateFallbackMessage(listings, totalCount);
    }
  }

  /**
   * Fallback message generation without LLM
   */
  private generateFallbackMessage(
    listings: ListingDetail[],
    totalCount: number,
  ): string {
    if (listings.length === 0) {
      return "I couldn't find any cars matching your criteria in our current inventory. Try adjusting your filters or browse all available vehicles.";
    }

    let message = `Great news! I found ${totalCount} car${totalCount > 1 ? 's' : ''} matching your criteria. `;

    if (listings.length > 0) {
      const firstListing = listings[0];
      const firstCar = firstListing?.carDetail;
      if (firstListing && firstCar) {
        message += `The top result is a ${firstCar.year} ${firstCar.make} ${firstCar.model} for $${firstListing.price.toLocaleString()}. `;
      }
    }

    if (totalCount > listings.length) {
      message += `I'm showing you the top ${listings.length} results. `;
    }

    message += 'Click on any car to see full details!';

    return message;
  }

  /**
   * Generate contextual suggestions based on search results
   */
  private generateContextualSuggestions(
    listings: ListingDetail[],
    extractedParams: any,
    _totalCount: number,
  ): SuggestionChip[] {
    const suggestions: SuggestionChip[] = [];

    // If results found, suggest refinements
    if (listings.length > 0) {
      // Suggest price adjustments
      if (!extractedParams.priceMax) {
        suggestions.push({
          id: 'price-filter',
          label: 'Set budget',
          query: 'Show cars under $30,000',
          icon: '💰',
        });
      }

      // Suggest viewing specific body types if not filtered
      if (!extractedParams.bodyTypes || extractedParams.bodyTypes.length === 0) {
        const commonBodyType = this.getMostCommonBodyType(listings);
        if (commonBodyType) {
          suggestions.push({
            id: 'body-type',
            label: `More ${commonBodyType}s`,
            query: `Show me ${commonBodyType} only`,
            icon: '🚙',
          });
        }
      }

      // Suggest features if not specified
      if (!extractedParams.features || extractedParams.features.length === 0) {
        suggestions.push({
          id: 'features',
          label: 'With specific features',
          query: 'Show cars with GPS and sunroof',
          icon: '⚙️',
        });
      }
    } else {
      // No results - suggest broader searches
      suggestions.push({
        id: 'all-cars',
        label: 'View all cars',
        query: 'Show me all available cars',
        icon: '🚗',
      });

      suggestions.push({
        id: 'expand-budget',
        label: 'Expand budget',
        query: 'Show cars under $50,000',
        icon: '💰',
      });

      suggestions.push({
        id: 'different-type',
        label: 'Different type',
        query: 'Show me SUVs',
        icon: '🚙',
      });
    }

    return suggestions.slice(0, 4); // Limit to 4 suggestions
  }

  /**
   * Get most common body type from listings
   */
  private getMostCommonBodyType(listings: ListingDetail[]): string | null {
    if (listings.length === 0) return null;

    const typeCounts: Record<string, number> = {};
    listings.forEach((listing) => {
      const type = listing.carDetail.bodyType;
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const mostCommon = Object.entries(typeCounts).sort(
      ([, a], [, b]) => b - a,
    )[0];

    return mostCommon ? mostCommon[0] : null;
  }

  /**
   * Get human-readable description of applied filters
   */
  private getAppliedFiltersDescription(params: any): string {
    const filters: string[] = [];

    if (params.makes?.length) {
      filters.push(`Make: ${params.makes.join(', ')}`);
    }
    if (params.models?.length) {
      filters.push(`Model: ${params.models.join(', ')}`);
    }
    if (params.yearMin || params.yearMax) {
      filters.push(
        `Year: ${params.yearMin || 'any'}-${params.yearMax || 'any'}`,
      );
    }
    if (params.bodyTypes?.length) {
      filters.push(`Type: ${params.bodyTypes.join(', ')}`);
    }
    if (params.fuelTypes?.length) {
      filters.push(`Fuel: ${params.fuelTypes.join(', ')}`);
    }
    if (params.priceMin || params.priceMax) {
      filters.push(
        `Price: $${params.priceMin || 0}-$${params.priceMax || '∞'}`,
      );
    }
    if (params.mileageMax) {
      filters.push(`Max mileage: ${params.mileageMax.toLocaleString()} miles`);
    }

    return filters.length > 0 ? filters.join(', ') : 'No specific filters';
  }

  /**
   * Handle FAQ queries using RAG (Retrieval Augmented Generation)
   * 
   * Process:
   * 1. Retrieve top 4 most relevant FAQs using vector search
   * 2. Feed them to LLM as context
   * 3. Generate a natural, helpful response
   */
  private async handleFAQ(userQuery: string): Promise<AssistantResponseDto> {
    try {
      this.logger.log(`Processing FAQ query with RAG: "${userQuery}"`);

      // Step 1: Retrieve top 3 most relevant FAQs using vector search
      const topFAQs = await this.faqRAGService.searchFAQs(
        userQuery,
        3, // Top 3 nearest neighbors
        0.3, // Minimum similarity threshold
      );

      this.logger.log(
        `Retrieved ${topFAQs.length} relevant FAQs (avg similarity: ${topFAQs.length > 0 ? (topFAQs.reduce((sum, r) => sum + r.similarity, 0) / topFAQs.length).toFixed(3) : 'N/A'})`
      );

      // Step 2: Build context from retrieved FAQs
      let faqContext = '';
      if (topFAQs.length > 0) {
        faqContext = topFAQs
          .map((result, index) => {
            return `FAQ ${index + 1} [${result.faq.category}] (Relevance: ${(result.similarity * 100).toFixed(1)}%):
Q: ${result.faq.question}
A: ${result.faq.answer}`;
          })
          .join('\n\n');
      }

      // Step 3: Generate response using LLM with retrieved context
      const systemPrompt = `You are a helpful customer service assistant for CarMarket, a car marketplace platform.

Your task is to answer the user's question based on the relevant FAQ information provided below.

${topFAQs.length > 0 ? `RELEVANT FAQ INFORMATION (from our knowledge base):

${faqContext}

` : 'No specific FAQ matches were found in our knowledge base. Provide a helpful general response based on your knowledge of car marketplaces.'}

GUIDELINES:
1. Use the FAQ information as your primary source of truth
2. If the FAQs answer the question directly, use that information
3. Be conversational and friendly - don't just copy the FAQ verbatim
4. If multiple FAQs are relevant, synthesize the information
5. If the FAQs don't fully answer the question, acknowledge this and provide general guidance
6. Keep your response concise (3-5 sentences)
7. Don't mention that you're using FAQs - make it sound natural
8. If appropriate, suggest related topics the user might want to explore

Remember: You're helping users navigate CarMarket, a platform for buying and selling used cars with features like:
- Advanced search and filters
- Real-time messaging with sellers
- Favorites system
- Virtual AI assistant
- User profiles and listings
- Car comparison tools`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userQuery },
        ],
        temperature: 0.7,
        max_tokens: 400,
      });

      const message =
        completion.choices[0]?.message?.content ||
        this.generateFallbackFAQResponse(userQuery, topFAQs);

      // Step 4: Generate contextual suggestions based on retrieved FAQs
      const suggestions = this.generateFAQSuggestions(topFAQs, userQuery);

      // Step 5: Generate action buttons if relevant
      const actions = this.generateFAQActions(topFAQs, userQuery);

      return {
        intent: UserIntent.FAQ,
        message,
        data: {
          retrievedFAQs: topFAQs.map(r => ({
            category: r.faq.category,
            question: r.faq.question,
            similarity: r.similarity,
          })),
          searchMetadata: {
            totalRetrieved: topFAQs.length,
            averageSimilarity: topFAQs.length > 0 
              ? topFAQs.reduce((sum, r) => sum + r.similarity, 0) / topFAQs.length 
              : 0,
          },
        },
        suggestions,
        actions,
      };
    } catch (error) {
      this.logger.error('Error handling FAQ with RAG:', error);
      
      // Fallback to simple response
      return {
        intent: UserIntent.FAQ,
        message:
          "I'm here to help! Please ask your question and I'll do my best to assist you. You can ask about searching for cars, selling your car, account management, or how our platform works.",
        suggestions: [
          {
            id: '1',
            label: 'How to search',
            query: 'How do I search for cars?',
            icon: '🔍',
          },
          {
            id: '2',
            label: 'Selling a car',
            query: 'How do I sell my car?',
            icon: '🚗',
          },
          {
            id: '3',
            label: 'Account help',
            query: 'How do I create an account?',
            icon: '👤',
          },
        ],
      };
    }
  }

  /**
   * Generate fallback FAQ response without LLM
   */
  private generateFallbackFAQResponse(
    _userQuery: string,
    topFAQs: any[],
  ): string {
    if (topFAQs.length === 0) {
      return "I'd be happy to help answer your question! While I don't have a specific FAQ match, you can ask me about searching for cars, selling your vehicle, account management, messaging sellers, or how our platform works.";
    }

    // Use the top FAQ's answer as the base response
    const topFAQ = topFAQs[0].faq;
    return `Based on our FAQ about "${topFAQ.question}": ${topFAQ.answer}`;
  }

  /**
   * Generate contextual suggestions based on retrieved FAQs
   */
  private generateFAQSuggestions(topFAQs: any[], _userQuery: string): SuggestionChip[] {
    const suggestions: SuggestionChip[] = [];

    // If we have relevant FAQs, suggest related questions
    if (topFAQs.length > 1) {
      // Add top 3 related FAQs as suggestions
      topFAQs.slice(1, 4).forEach((result, index) => {
        suggestions.push({
          id: `faq-${index}`,
          label: this.truncateText(result.faq.question, 50),
          query: result.faq.question,
          icon: '❓',
        });
      });
    }

    // If we don't have enough suggestions, add common ones
    if (suggestions.length < 3) {
      const commonSuggestions = [
        {
          id: 'search',
          label: 'How to search',
          query: 'How do I search for cars?',
          icon: '🔍',
        },
        {
          id: 'sell',
          label: 'Selling a car',
          query: 'How do I list my car for sale?',
          icon: '📝',
        },
        {
          id: 'contact',
          label: 'Contact seller',
          query: 'How do I contact a seller?',
          icon: '💬',
        },
        {
          id: 'account',
          label: 'Account help',
          query: 'How do I create an account?',
          icon: '👤',
        },
      ];

      // Add common suggestions that aren't already included
      for (const suggestion of commonSuggestions) {
        if (suggestions.length >= 4) break;
        if (!suggestions.some(s => s.query === suggestion.query)) {
          suggestions.push(suggestion);
        }
      }
    }

    return suggestions.slice(0, 4);
  }

  /**
   * Generate action buttons based on FAQ context
   */
  private generateFAQActions(topFAQs: any[], userQuery: string): MessageAction[] {
    const actions: MessageAction[] = [];
    const queryLower = userQuery.toLowerCase();

    // Check FAQ categories and questions to determine relevant actions
    const categories = topFAQs.map(r => r.faq.category.toLowerCase());
    // Precompute questions if needed in future; not used currently

    // Action: Browse cars
    if (
      queryLower.includes('search') ||
      queryLower.includes('find') ||
      queryLower.includes('browse') ||
      categories.includes('browsing cars') ||
      categories.includes('search & filters')
    ) {
      actions.push({
        label: 'Browse Cars',
        action: 'navigate',
        data: { url: '/' },
      });
    }

    // Action: Sell a car
    if (
      queryLower.includes('sell') ||
      queryLower.includes('list') ||
      categories.includes('selling process')
    ) {
      actions.push({
        label: 'List Your Car',
        action: 'navigate',
        data: { url: '/sell-car' },
      });
    }

    // Action: View favorites
    if (
      queryLower.includes('favorite') ||
      queryLower.includes('saved') ||
      categories.includes('favorites')
    ) {
      actions.push({
        label: 'My Favorites',
        action: 'view_favorites',
        data: {},
      });
    }

    // Action: View messages
    if (
      queryLower.includes('message') ||
      queryLower.includes('chat') ||
      queryLower.includes('contact seller') ||
      categories.includes('chat & messaging')
    ) {
      actions.push({
        label: 'My Messages',
        action: 'view_conversations',
        data: {},
      });
    }

    return actions.slice(0, 3); // Limit to 3 actions
  }

  /**
   * Helper: Truncate text with ellipsis
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  private async handleCarCompare(
    userQuery: string,
    _extractedEntities: any,
  ): Promise<AssistantResponseDto> {
    try {
      this.logger.log(`Processing car_compare query: "${userQuery}"`);

      // Use the dedicated comparison service
      const comparisonData =
        await this.carComparisonService.compareCars(userQuery);

      // Generate natural language response
      const message = await this.generateComparisonMessage(
        userQuery,
        comparisonData,
      );

      // Generate suggestions based on results
      const suggestions = this.generateComparisonSuggestions(comparisonData);

      // Generate action buttons for inventory items
      const actions = this.generateComparisonActions(comparisonData);

      return {
        intent: UserIntent.CAR_COMPARE,
        message,
        data: comparisonData, // Include full structured comparison data
        suggestions,
        actions,
      };
    } catch (error) {
      this.logger.error('Error handling car compare:', error);
      return {
        intent: UserIntent.CAR_COMPARE,
        message:
          "I can help you compare cars! Please specify which two vehicles you'd like to compare (e.g., 'Compare Honda Civic vs Toyota Corolla').",
        suggestions: [
          {
            id: '1',
            label: 'Browse cars',
            query: 'Show me all available cars',
            icon: '🚗',
          },
          {
            id: '2',
            label: 'Car specs',
            query: 'What are the specs of BMW X5?',
            icon: '📊',
          },
        ],
      };
    }
  }

  /**
   * Generate natural language comparison message using LLM
   */
  private async generateComparisonMessage(
    userQuery: string,
    comparisonData: any,
  ): Promise<string> {
    try {
      const { car1, car2, summary, foundInInventory } = comparisonData;

      // If both cars found in inventory, highlight that fact
      if (foundInInventory && car1 && car2) {
        const systemPrompt = `You are a helpful car marketplace assistant.
Generate a friendly comparison message for two cars that ARE CURRENTLY AVAILABLE in our inventory.

Guidelines:
1. Start by mentioning that both cars are available for purchase
2. Highlight key differences from the summary provided
3. Mention the prices
4. Keep it conversational and helpful (3-5 sentences)
5. End with encouraging them to view the listings
6. Don't repeat the full detailed comparison - just highlight key points

Be enthusiastic about the fact that we have both cars in stock!`;

        const userPrompt = `User asked: "${userQuery}"

Car 1: ${car1.specs.year} ${car1.specs.make} ${car1.specs.model}
Price: $${car1.price.toLocaleString()}
Mileage: ${car1.specs.mileage.toLocaleString()} km
Condition: ${car1.specs.condition}

Car 2: ${car2.specs.year} ${car2.specs.make} ${car2.specs.model}
Price: $${car2.price.toLocaleString()}
Mileage: ${car2.specs.mileage.toLocaleString()} km
Condition: ${car2.specs.condition}

Summary:
${car1.specs.make} ${car1.specs.model} advantages: ${summary.car1Advantages.join(', ')}
${car2.specs.make} ${car2.specs.model} advantages: ${summary.car2Advantages.join(', ')}
${summary.overallWinner ? `Overall winner: ${summary.overallWinner}` : 'Both are great choices'}

Generate a helpful comparison message.`;

        const completion = await this.openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 300,
        });

        const llmMessage = completion.choices[0]?.message?.content;

        if (llmMessage) {
          return llmMessage;
        }
      }

      // If only one car found, or no cars found - use general comparison
      if (!foundInInventory || !car1 || !car2) {
        const inventoryStatus =
          comparisonData.inventoryCount.car1Count > 0 ||
          comparisonData.inventoryCount.car2Count > 0
            ? this.generatePartialInventoryMessage(comparisonData)
            : '';

        const systemPrompt = `You are a knowledgeable car expert assistant.
The user wants to compare two cars, but we don't have both in our current inventory.

Provide a helpful general comparison covering:
- Performance and key differences
- Typical price range
- Fuel efficiency
- Which type of buyer each car suits
- Overall recommendation

Keep it conversational and helpful (5-7 sentences).
${inventoryStatus ? 'IMPORTANT: Mention that we have some of these models in stock (details will be appended).' : ''}`;

        const completion = await this.openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userQuery },
          ],
          temperature: 0.7,
          max_tokens: 500,
        });

        const llmMessage =
          completion.choices[0]?.message?.content ||
          this.generateFallbackComparisonMessage(userQuery);

        return inventoryStatus
          ? `${llmMessage}\n\n${inventoryStatus}`
          : llmMessage;
      }

      return this.generateFallbackComparisonMessage(userQuery);
    } catch (error) {
      this.logger.error('Error generating comparison message:', error);
      return this.generateFallbackComparisonMessage(userQuery);
    }
  }

  /**
   * Generate message when we have partial inventory
   */
  private generatePartialInventoryMessage(comparisonData: any): string {
    const messages: string[] = [];

    if (comparisonData.inventoryCount.car1Count > 0 && comparisonData.car1) {
      messages.push(
        `📋 We have ${comparisonData.inventoryCount.car1Count} ${comparisonData.car1.specs.make} ${comparisonData.car1.specs.model} in stock starting at $${comparisonData.car1.price.toLocaleString()}.`,
      );
    }

    if (comparisonData.inventoryCount.car2Count > 0 && comparisonData.car2) {
      messages.push(
        `📋 We have ${comparisonData.inventoryCount.car2Count} ${comparisonData.car2.specs.make} ${comparisonData.car2.specs.model} in stock starting at $${comparisonData.car2.price.toLocaleString()}.`,
      );
    }

    return messages.join(' ');
  }

  /**
   * Fallback comparison message
   */
  private generateFallbackComparisonMessage(_userQuery: string): string {
    return `I'd be happy to help you compare these cars! Based on your query, I can provide a detailed comparison covering performance, features, pricing, and overall value. Unfortunately, I don't have both models currently in our inventory, but I can still give you expert insights to help you make an informed decision. Would you like to see what similar cars we have available?`;
  }

  /**
   * Generate contextual suggestions for comparison
   */
  private generateComparisonSuggestions(
    comparisonData: any,
  ): SuggestionChip[] {
    const suggestions: SuggestionChip[] = [];

    // If we found cars in inventory
    if (comparisonData.foundInInventory && comparisonData.car1 && comparisonData.car2) {
      suggestions.push(
        {
          id: '1',
          label: `View ${comparisonData.car1.specs.make} listings`,
          query: `Show me all ${comparisonData.car1.specs.make} ${comparisonData.car1.specs.model} cars`,
          icon: '🚗',
        },
        {
          id: '2',
          label: `View ${comparisonData.car2.specs.make} listings`,
          query: `Show me all ${comparisonData.car2.specs.make} ${comparisonData.car2.specs.model} cars`,
          icon: '🚗',
        },
        {
          id: '3',
          label: 'Compare other SUVs',
          query: 'Show me available SUVs to compare',
          icon: '⚖️',
        },
      );
    } else if (comparisonData.car1 || comparisonData.car2) {
      // Only one car found
      const foundCar = comparisonData.car1 || comparisonData.car2;
      suggestions.push(
        {
          id: '1',
          label: `View ${foundCar.specs.make} ${foundCar.specs.model}`,
          query: `Show me the ${foundCar.specs.make} ${foundCar.specs.model}`,
          icon: '🚗',
        },
        {
          id: '2',
          label: 'Browse similar cars',
          query: `Show me ${foundCar.specs.bodyType} cars`,
          icon: '🚙',
        },
      );
    } else {
      // No cars found in inventory
      suggestions.push(
        {
          id: '1',
          label: 'View all cars',
          query: 'Show me all available cars',
          icon: '🚗',
        },
        {
          id: '2',
          label: 'Browse SUVs',
          query: 'Show me available SUVs',
          icon: '🚙',
        },
      );
    }

    suggestions.push({
      id: '4',
      label: 'Get buying tips',
      query: 'How do I choose the right car?',
      icon: '💡',
    });

    return suggestions.slice(0, 4);
  }

  /**
   * Generate action buttons for comparison
   */
  private generateComparisonActions(comparisonData: any): MessageAction[] {
    const actions: MessageAction[] = [];

    if (comparisonData.car1) {
      actions.push({
        label: `View ${comparisonData.car1.specs.year} ${comparisonData.car1.specs.make} ${comparisonData.car1.specs.model}`,
        action: 'view_listing',
        data: { listingId: comparisonData.car1.listingId },
      });
    }

    if (comparisonData.car2) {
      actions.push({
        label: `View ${comparisonData.car2.specs.year} ${comparisonData.car2.specs.make} ${comparisonData.car2.specs.model}`,
        action: 'view_listing',
        data: { listingId: comparisonData.car2.listingId },
      });
    }

    return actions;
  }

  private async handleUserInfo(
    userQuery: string,
    currentUser?: User,
  ): Promise<AssistantResponseDto> {
    try {
      if (!currentUser) {
        return {
          intent: UserIntent.USER_INFO,
          message:
            "I'd be happy to help with your account information, but it seems you're not logged in. Please log in to view your profile, listings, and favorites.",
          suggestions: [
            {
              id: '1',
              label: 'Log in',
              query: 'How do I log in?',
              icon: '🔑',
            },
          ],
        };
      }

      this.logger.log(
        `Processing user_info query for user: ${currentUser.id}`,
      );

      // Fetch comprehensive user context
      const userContext = await this.userContextService.getUserContext(
        currentUser.id,
      );

      // Format context for LLM
      const contextString =
        this.userContextService.formatContextForPrompt(userContext);

      const systemPrompt = `You are a helpful personal assistant for a car marketplace user.
The user is asking about their own account, activity, or personal information.

Here is the current user's information:

${contextString}

Provide a friendly, personalized response based on this information.
Guidelines:
1. Be conversational and use their name when appropriate
2. Provide specific numbers and details from their account
3. Highlight interesting insights (e.g., most expensive favorite, recent activity)
4. If they ask about specific items, provide relevant details
5. Suggest helpful actions they might want to take
6. Keep the response natural and engaging (3-5 sentences)
7. Always be positive and encouraging`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userQuery },
        ],
        temperature: 0.7,
        max_tokens: 400,
      });

      const message =
        completion.choices[0]?.message?.content ||
        this.generateFallbackUserInfoMessage(userContext);

      // Generate actions based on user's data
      const actions: MessageAction[] = [];

      if (userContext.listings.active > 0) {
        actions.push({
          label: 'View My Listings',
          action: 'view_my_listings',
          data: {},
        });
      }

      if (userContext.favorites.count > 0) {
        actions.push({
          label: 'View My Favorites',
          action: 'view_favorites',
          data: {},
        });
      }

      if (userContext.conversations.total > 0) {
        actions.push({
          label: 'View Messages',
          action: 'view_conversations',
          data: { unreadCount: userContext.conversations.unreadCount },
        });
      }

      // Generate contextual suggestions
      const suggestions = this.generateUserInfoSuggestions(userContext);

      return {
        intent: UserIntent.USER_INFO,
        message,
        data: {
          userContext,
        },
        suggestions,
        actions: actions.slice(0, 3), // Limit to 3 actions
      };
    } catch (error) {
      this.logger.error('Error handling user info:', error);
      return {
        intent: UserIntent.USER_INFO,
        message:
          "I'm having trouble accessing your account information right now. Please try again or visit your profile page.",
        suggestions: [
          {
            id: '1',
            label: 'View Profile',
            query: 'Take me to my profile',
            icon: '👤',
          },
        ],
      };
    }
  }

  /**
   * Generate fallback message for user info without LLM
   */
  private generateFallbackUserInfoMessage(userContext: any): string {
    const lines: string[] = [];

    lines.push(
      `Hi ${userContext.profile.fullName}! Here's a summary of your account:`,
    );

    if (userContext.listings.active > 0) {
      lines.push(
        `\n🚗 You have ${userContext.listings.active} active listing${userContext.listings.active > 1 ? 's' : ''}.`,
      );
    }

    if (userContext.favorites.count > 0) {
      lines.push(
        `❤️ You've saved ${userContext.favorites.count} favorite car${userContext.favorites.count > 1 ? 's' : ''}.`,
      );
    }

    if (userContext.conversations.total > 0) {
      lines.push(
        `💬 You have ${userContext.conversations.total} conversation${userContext.conversations.total > 1 ? 's' : ''}${userContext.conversations.unreadCount > 0 ? ` with ${userContext.conversations.unreadCount} unread message${userContext.conversations.unreadCount > 1 ? 's' : ''}` : ''}.`,
      );
    }

    if (
      userContext.listings.active === 0 &&
      userContext.favorites.count === 0 &&
      userContext.conversations.total === 0
    ) {
      lines.push(
        "\n🎉 You're all set up! Start by browsing cars or listing your own vehicle for sale.",
      );
    }

    return lines.join(' ');
  }

  /**
   * Generate contextual suggestions for user info queries
   */
  private generateUserInfoSuggestions(userContext: any): SuggestionChip[] {
    const suggestions: SuggestionChip[] = [];

    if (userContext.listings.active === 0) {
      suggestions.push({
        id: 'sell-car',
        label: 'List a car',
        query: 'How do I sell my car?',
        icon: '📝',
      });
    } else {
      suggestions.push({
        id: 'my-listings',
        label: 'My listings',
        query: 'Show me my listings',
        icon: '📋',
      });
    }

    if (userContext.favorites.count > 0) {
      suggestions.push({
        id: 'my-favorites',
        label: 'My favorites',
        query: 'What are my favorite cars?',
        icon: '❤️',
      });
    } else {
      suggestions.push({
        id: 'browse-cars',
        label: 'Browse cars',
        query: 'Show me available cars',
        icon: '🚗',
      });
    }

    if (userContext.conversations.unreadCount > 0) {
      suggestions.push({
        id: 'unread-messages',
        label: `${userContext.conversations.unreadCount} unread`,
        query: 'Show my unread messages',
        icon: '💬',
      });
    }

    suggestions.push({
      id: 'profile',
      label: 'My profile',
      query: 'What is my profile information?',
      icon: '👤',
    });

    return suggestions.slice(0, 4); // Limit to 4 suggestions
  }

  private async handleCarValuation(): Promise<AssistantResponseDto> {
    try {
      // Get available makes for valuation
      const makes = await this.metadataService.getValuationMakes();

      return {
        intent: UserIntent.CAR_VALUATION,
        message:
          'I\'ll help you estimate your car\'s value. Please fill in the information below to get the most accurate price estimate.',
        data: {
          type: 'valuation_form',
          makes, // Provide makes so client can start loading
        },
        suggestions: [
          {
            id: '1',
            label: 'View available cars',
            query: 'What cars do you have available?',
            icon: '🚗',
          },
        ],
      };
    } catch (error) {
      this.logger.error('Error handling car valuation:', error);
      return {
        intent: UserIntent.CAR_VALUATION,
        message:
          'Sorry, I\'m having trouble loading the valuation form. Please try again later or visit the valuation page directly.',
        suggestions: [],
      };
    }
  }
}

