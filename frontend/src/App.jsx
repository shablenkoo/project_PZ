import { useEffect, useState } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

function App() {
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(false);

  // --- ВАШІ ДАНІ ТУТ ---
  const MONO_TOKEN = "uL5uaqt7eFP9KmABOSJi1Qc6JqGL_k6OEPYnbXGzZHmk";
  const MONO_ACC_ID = "R1qIe2zyBCk8YyG8ey7Y7g";

  // Функція завантаження даних з ВАШОГО бекенду
  const loadData = async () => {
    try {
      const [resTx, resStats] = await Promise.all([
        axios.get('http://127.0.0.1:8000/transactions'),
        axios.get('http://127.0.0.1:8000/stats')
      ]);
      setTransactions(resTx.data);
      setStats(resStats.data);
    } catch (e) {
      console.error("Помилка завантаження", e);
    }
  };

  // Функція синхронізації з Monobank через бекенд
  const syncWithBank = async () => {
    setLoading(true);
    try {
      // Викликаємо ваш бекенд, який вже сам піде в Монобанк
      await axios.post(`http://127.0.0.1:8000/sync?token=${MONO_TOKEN}&account_id=${MONO_ACC_ID}`);
      await loadData(); // Оновлюємо таблицю та графік
      alert("Синхронізація успішна!");
    } catch (e) {
      console.error(e);
      alert("Помилка! Можливо, ви оновлюєте дані частіше ніж раз на хвилину.");
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Finance Dashboard</h1>
          <button
            onClick={syncWithBank}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition shadow-md"
          >
            {loading ? "Синхронізація..." : "Оновити з Monobank"}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* ГРАФІК */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm min-h-[400px]">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">Аналіз витрат</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* КАРТКА ВИТРАТ */}
          <div className="bg-white p-6 rounded-xl shadow-sm flex flex-col justify-center border-t-4 border-red-500">
            <p className="text-gray-500 uppercase text-sm font-bold">Всього витрачено за місяць</p>
            <p className="text-4xl font-black text-red-600 mt-2">
              {stats.reduce((acc, curr) => acc + curr.value, 0).toFixed(2)} ₴
            </p>
          </div>
        </div>

        {/* ТАБЛИЦЯ */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <h3 className="font-bold text-gray-700">Останні транзакції ({transactions.length})</h3>
          </div>
          <div className="max-h-[500px] overflow-y-auto text-sm">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 sticky top-0">
                <tr className="text-gray-400 uppercase text-xs">
                  <th className="p-4">Дата</th>
                  <th className="p-4">Опис</th>
                  <th className="p-4">Категорія</th>
                  <th className="p-4 text-right">Сума</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => (
                  <tr key={tx.id} className="border-b hover:bg-gray-50 transition">
                    <td className="p-4 text-gray-500">{new Date(tx.time).toLocaleDateString()}</td>
                    <td className="p-4 font-medium">{tx.description}</td>
                    <td className="p-4 text-blue-500 font-bold uppercase text-[10px]">{tx.category}</td>
                    <td className={`p-4 text-right font-bold ${tx.amount < 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {tx.amount.toFixed(2)} ₴
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;