import React, { useState, useEffect } from 'react';
import { ValuationService } from '../services/valuation.service';
import { MetadataService } from '../services/metadata.service';
import type { ValuationResponse } from '../services/valuation.service';

export const CarValuationPage: React.FC = () => {
  const [make, setMake] = useState<string>('');
  const [model, setModel] = useState<string>('');
  const [year, setYear] = useState<number | ''>('');
  const [version, setVersion] = useState<string>('');
  const [color, setColor] = useState<string>('');
  const [mileage, setMileage] = useState<number>(50000);
  
  // Dropdown data
  const [makes, setMakes] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [versions, setVersions] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  
  // Loading states
  const [loadingMakes, setLoadingMakes] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingYears, setLoadingYears] = useState(false);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [loadingColors, setLoadingColors] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ValuationResponse | null>(null);

  // Load makes on mount
  useEffect(() => {
    const loadMakes = async () => {
      try {
        setLoadingMakes(true);
        const data = await MetadataService.getValuationMakes();
        setMakes(data);
        if (data.length > 0) {
          setMake(data[0]);
        }
      } catch (err) {
        console.error('Failed to load makes:', err);
      } finally {
        setLoadingMakes(false);
      }
    };
    loadMakes();
  }, []);

  // Load models when make changes
  useEffect(() => {
    if (!make) {
      setModels([]);
      setModel('');
      return;
    }

    const loadModels = async () => {
      try {
        setLoadingModels(true);
        const data = await MetadataService.getValuationModels(make);
        setModels(data);
        setModel('');
        setYear('');
        setVersion('');
        setColor('');
        setYears([]);
        setVersions([]);
        setColors([]);
      } catch (err) {
        console.error('Failed to load models:', err);
        setModels([]);
      } finally {
        setLoadingModels(false);
      }
    };
    loadModels();
  }, [make]);

  // Load years when model changes
  useEffect(() => {
    if (!make || !model) {
      setYears([]);
      setYear('');
      return;
    }

    const loadYears = async () => {
      try {
        setLoadingYears(true);
        const data = await MetadataService.getValuationYears(make, model);
        setYears(data);
        setYear('');
        setVersion('');
        setColor('');
        setVersions([]);
        setColors([]);
      } catch (err) {
        console.error('Failed to load years:', err);
        setYears([]);
      } finally {
        setLoadingYears(false);
      }
    };
    loadYears();
  }, [make, model]);

  // Load versions when year changes
  useEffect(() => {
    if (!make || !model || !year) {
      setVersions([]);
      setVersion('');
      return;
    }

    const loadVersions = async () => {
      try {
        setLoadingVersions(true);
        const data = await MetadataService.getValuationVersions(make, model, year as number);
        setVersions(data);
        setVersion('');
        setColor('');
        setColors([]);
      } catch (err) {
        console.error('Failed to load versions:', err);
        setVersions([]);
      } finally {
        setLoadingVersions(false);
      }
    };
    loadVersions();
  }, [make, model, year]);

  // Load colors when version changes (or when year changes if no versions)
  useEffect(() => {
    if (!make || !model || !year) {
      setColors([]);
      setColor('');
      return;
    }

    const loadColors = async () => {
      try {
        setLoadingColors(true);
        const data = await MetadataService.getValuationColors(
          make,
          model,
          year as number,
          version || undefined
        );
        setColors(data);
        setColor('');
      } catch (err) {
        console.error('Failed to load colors:', err);
        setColors([]);
      } finally {
        setLoadingColors(false);
      }
    };
    loadColors();
  }, [make, model, year, version]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!make || !model || !year) {
      setError('Vui lòng chọn đầy đủ thông tin: Hãng xe, Dòng xe và Năm sản xuất');
      return;
    }

    setLoading(true);

    try {
      const data = await ValuationService.estimatePrice({
        brand: make,
        model,
        year: year as number,
        mileage_km: mileage,
        version: version || undefined,
        color: color || undefined,
      });
      setResult(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.response?.data?.message || 'Không thể định giá xe, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Định giá xe cũ</h1>
      <p className="text-sm text-gray-600 mb-6">
        Nhập thông tin về xe để nhận ước tính giá dựa trên mô hình Machine Learning (Random Forest). 
        Model được train trên dữ liệu từ bonbanh.com và oto.com.vn với độ chính xác R² = 0.959.
      </p>

      <form onSubmit={handleSubmit} className="grid gap-4 max-w-xl">
        <div>
          <label className="block text-sm font-medium mb-1">Hãng xe *</label>
          <select
            value={make}
            onChange={(e) => setMake(e.target.value)}
            className="border rounded px-3 py-2 w-full"
            required
            disabled={loadingMakes}
          >
            <option value="">-- Chọn hãng xe --</option>
            {makes.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          {loadingMakes && <p className="text-xs text-gray-500 mt-1">Đang tải...</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Dòng xe / Model *</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="border rounded px-3 py-2 w-full"
            required
            disabled={!make || loadingModels}
          >
            <option value="">-- Chọn dòng xe --</option>
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          {loadingModels && <p className="text-xs text-gray-500 mt-1">Đang tải...</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Năm sản xuất *</label>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value ? Number(e.target.value) : '')}
              className="border rounded px-3 py-2 w-full"
              required
              disabled={!model || loadingYears}
            >
              <option value="">-- Chọn năm --</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            {loadingYears && <p className="text-xs text-gray-500 mt-1">Đang tải...</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Số km đã đi *</label>
            <input
              type="number"
              value={mileage}
              onChange={(e) => setMileage(Number(e.target.value))}
              className="border rounded px-3 py-2 w-full"
              min={0}
              required
            />
          </div>
        </div>

        {versions.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-1">
              Phiên bản xe <span className="text-gray-500">(tùy chọn)</span>
            </label>
            <select
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className="border rounded px-3 py-2 w-full"
              disabled={!year || loadingVersions}
            >
              <option value="">-- Chọn phiên bản --</option>
              {versions.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
            {loadingVersions && <p className="text-xs text-gray-500 mt-1">Đang tải...</p>}
          </div>
        )}

        {colors.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-1">
              Màu xe <span className="text-gray-500">(tùy chọn)</span>
            </label>
            <select
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="border rounded px-3 py-2 w-full"
              disabled={!year || loadingColors}
            >
              <option value="">-- Chọn màu --</option>
              {colors.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {loadingColors && <p className="text-xs text-gray-500 mt-1">Đang tải...</p>}
          </div>
        )}

        <button
          type="submit"
          className="bg-blue-600 text-white rounded px-4 py-2 mt-2 disabled:opacity-60"
          disabled={loading || !make || !model || !year}
        >
          {loading ? 'Đang định giá...' : 'Định giá'}
        </button>
      </form>

      {error && <p className="text-red-600 mt-4">{error}</p>}

      {result && (
        <div className="mt-6 border rounded-lg px-6 py-5 bg-gradient-to-br from-blue-50 to-indigo-50 max-w-xl shadow-lg">
          <h2 className="text-xl font-bold mb-4 text-gray-800">💰 Kết quả ước tính giá</h2>
          
          <div className="bg-white rounded-lg p-4 mb-4 shadow-sm">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Giá dự đoán</p>
              <p className="text-3xl font-bold text-blue-600">
                {Math.round(result.price_estimate).toLocaleString('vi-VN')} triệu VND
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 mb-4 shadow-sm">
            <p className="text-sm text-gray-600 mb-2">📊 Khoảng giá tham khảo:</p>
            <p className="text-lg font-semibold text-gray-800">
              {Math.round(result.price_min).toLocaleString('vi-VN')} - {Math.round(result.price_max).toLocaleString('vi-VN')} triệu VND
            </p>
          </div>

          {result.confidence_level && (
            <div className="bg-white rounded-lg p-4 mb-4 shadow-sm">
              <p className="text-sm text-gray-600 mb-1">✅ Độ tin cậy:</p>
              <p className="font-semibold text-green-600">{result.confidence_level}</p>
            </div>
          )}

          {result.mae_estimate && (
            <div className="bg-white rounded-lg p-4 mb-4 shadow-sm">
              <p className="text-sm text-gray-600 mb-1">⚠️ Sai số ước tính:</p>
              <p className="font-semibold text-orange-600">±{Math.round(result.mae_estimate).toLocaleString('vi-VN')} triệu VND</p>
            </div>
          )}

          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800">
              <strong>Lưu ý:</strong> Đây chỉ là mức giá tham khảo dựa trên mô hình machine learning, 
              chưa thay thế được thẩm định thực tế. Giá thực tế có thể khác tùy thuộc vào tình trạng xe, 
              lịch sử sử dụng và các yếu tố khác.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CarValuationPage;
