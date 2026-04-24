import { useEffect, useState } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
const API_URL = "http://127.0.0.1:8000";

function App() {
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState({ categories: [], total_income: 0, total_expenses: 0 });
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [days, setDays] = useState(30); // Для фільтрації по датах
  const [darkMode, setDarkMode] = useState(localStorage.getItem('theme') === 'dark');

  // Стан для авторизації
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState("");

  // Стан для налаштувань
  const [monoToken, setMonoToken] = useState("");
  const [monoAccId, setMonoAccId] = useState("");

  const getAuthHeader = () => ({ headers: { Authorization: `Bearer ${token}` } });

  // Завантаження даних (з урахуванням днів та бюджетів)
  const loadData = async () => {
    if (!token) return;
    try {
      const [resTx, resStats, resBudgets] = await Promise.all([
        axios.get(`${API_URL}/transactions?days=${days}`, getAuthHeader()),
        axios.get(`${API_URL}/stats`, getAuthHeader()),
        axios.get(`${API_URL}/budgets`, getAuthHeader())
      ]);
      setTransactions(resTx.data);
      setStats(resStats.data);
      setBudgets(resBudgets.data);
    } catch (e) {
      if (e.response?.status === 401) handleLogout();
    }
  };

  useEffect(() => {
    if (token) loadData();
  }, [token, days]);

  useEffect(() => {
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);
      const res = await axios.post(`${API_URL}/token`, formData);
      localStorage.setItem('token', res.data.access_token);
      setToken(res.data.access_token);
    } catch (err) { setError("Невірний логін або пароль"); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await axios.post(`${API_URL}/register`, { username, password });
      alert("Реєстрація успішна! Увійдіть.");
      setIsLogin(true);
    } catch (err) { setError("Помилка реєстрації"); }
  };

  const editCategory = async (txId, currentCat) => {
    const newCat = prompt("Змінити категорію на:", currentCat);
    if (newCat) {
      await axios.put(`${API_URL}/transactions/${txId}`, { category: newCat }, getAuthHeader());
      loadData();
    }
  };

  const addBudget = async () => {
    const cat = prompt("Вкажіть категорію для ліміту:");
    const amt = prompt("Вкажіть суму ліміту:");
    if (cat && amt) {
      await axios.post(`${API_URL}/budgets`, { category: cat, limit_amount: parseFloat(amt) }, getAuthHeader());
      loadData();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setTransactions([]);
  };

  const filteredTransactions = transactions.filter(tx =>
      tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- ЕКРАН АВТОРИЗАЦІЇ (З ТВОЇМ ГРАДІЄНТОМ) ---
  if (!token) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-tr from-slate-900 to-blue-900 p-4">
          <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-2xl">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-black text-gray-800 tracking-tight">FinanceApp</h2>
              <p className="text-gray-500 mt-2">{isLogin ? "Вітаємо знову!" : "Створіть акаунт"}</p>
            </div>
            {error && <div className="bg-red-50 text-red-600 p-3 mb-4 rounded-xl text-sm">{error}</div>}
            <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-5">
              <input type="text" placeholder="Логін" className="w-full p-3 border rounded-xl bg-gray-50 outline-blue-500" onChange={e => setUsername(e.target.value)} required />
              <input type="password" placeholder="Пароль" className="w-full p-3 border rounded-xl bg-gray-50 outline-blue-500" onChange={e => setPassword(e.target.value)} required />
              <button className="w-full bg-blue-600 text-white p-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg transition-all">{isLogin ? "Увійти" : "Зареєструватися"}</button>
            </form>
            <button onClick={() => setIsLogin(!isLogin)} className="w-full mt-6 text-sm font-semibold text-blue-600">{isLogin ? "Створити акаунт" : "Вже є акаунт? Увійдіть"}</button>
          </div>
        </div>
    );
  }

  // --- ОСНОВНИЙ ЕКРАН (ТВІЙ ВІЗУАЛ + НОВІ ФУНКЦІЇ) ---
  return (
      <div className={`${darkMode ? 'bg-slate-900 text-white' : 'bg-gray-50 text-gray-900'} min-h-screen p-4 md:p-8 transition-colors duration-500`}>
        <div className="max-w-6xl mx-auto">

          {/* HEADER */}
          <header className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
            <div>
              <h1 className={`${darkMode ? 'text-white' : 'text-gray-900'} text-4xl font-black tracking-tight italic`}>Dashboard</h1>
              <p className="text-gray-500 font-medium">Ваша фінансова аналітика</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDarkMode(!darkMode)} className={`p-3 rounded-xl font-bold transition shadow-sm ${darkMode ? 'bg-slate-800 text-yellow-400' : 'bg-white text-gray-600'}`}>
                {darkMode ? '☀️' : '🌙'}
              </button>
              <button onClick={() => setShowSettings(!showSettings)} className={`p-3 rounded-xl font-bold transition shadow-sm ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>⚙️</button>
              <button onClick={handleLogout} className="bg-rose-500 text-white px-6 py-2 rounded-xl font-bold shadow-sm hover:bg-rose-600">Вийти</button>
            </div>
          </header>

          {/* SETTINGS PANEL */}
          {showSettings && (
              <div className={`mb-8 p-8 rounded-3xl shadow-xl animate-in fade-in duration-300 ${darkMode ? 'bg-blue-900' : 'bg-blue-600'} text-white`}>
                <h2 className="text-xl font-bold mb-4">Налаштування API Monobank</h2>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  await axios.post(`${API_URL}/settings`, { mono_token: monoToken, mono_account_id: monoAccId }, getAuthHeader());
                  setShowSettings(false);
                  loadData();
                }} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input type="password" placeholder="Мій X-Token" className="p-3 rounded-xl text-gray-800" onChange={e => setMonoToken(e.target.value)} required />
                  <input type="text" placeholder="Мій Account ID" className="p-3 rounded-xl text-gray-800" onChange={e => setMonoAccId(e.target.value)} required />
                  <button className="bg-white text-blue-600 font-bold p-3 rounded-xl hover:bg-blue-50 transition">Зберегти</button>
                </form>
              </div>
          )}

          {/* DATE FILTER BUTTONS */}
          <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
            {[7, 30, 90, 365].map(d => (
                <button
                    key={d} onClick={() => setDays(d)}
                    className={`px-6 py-2 rounded-full font-bold transition whitespace-nowrap ${days === d ? 'bg-blue-600 text-white shadow-lg' : (darkMode ? 'bg-slate-800 text-gray-400' : 'bg-white text-gray-500 shadow-sm')}`}
                >
                  {d === 365 ? 'Рік' : `${d} днів`}
                </button>
            ))}
          </div>

          {/* STAT CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 text-center uppercase font-black text-[10px] tracking-widest">
            <div className={`p-8 rounded-3xl shadow-sm border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
              <p className="text-gray-400 mb-2">Баланс за період</p>
              <p className={`text-4xl ${(stats.total_income - stats.total_expenses) >= 0 ? 'text-blue-500' : 'text-rose-500'}`}>
                {(stats.total_income - stats.total_expenses).toFixed(2)} ₴
              </p>
            </div>
            <div className={`p-8 rounded-3xl shadow-sm border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
              <p className="text-gray-400 mb-2 text-emerald-500">Доходи (+)</p>
              <p className="text-4xl text-emerald-500">+{stats.total_income.toFixed(2)} ₴</p>
            </div>
            <div className={`p-8 rounded-3xl shadow-sm border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
              <p className="text-gray-400 mb-2 text-rose-500">Витрати (-)</p>
              <p className="text-4xl text-rose-500">-{stats.total_expenses.toFixed(2)} ₴</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* BUDGETS SECTION */}
            <div className={`p-6 rounded-3xl shadow-sm border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold">Ліміти</h3>
                <button onClick={addBudget} className="text-blue-500 font-bold text-xl">+</button>
              </div>
              <div className="space-y-6">
                {budgets.map(b => {
                  const spent = stats.categories.find(c => c.name === b.category)?.value || 0;
                  const percent = Math.min((spent / b.limit_amount) * 100, 100);
                  return (
                      <div key={b.id}>
                        <div className="flex justify-between text-[10px] font-black uppercase mb-1">
                          <span>{b.category}</span>
                          <span className={percent > 90 ? 'text-rose-500' : ''}>{spent.toFixed(0)} / {b.limit_amount} ₴</span>
                        </div>
                        <div className={`h-1.5 w-full rounded-full overflow-hidden ${darkMode ? 'bg-slate-700' : 'bg-gray-100'}`}>
                          <div className={`h-full transition-all duration-1000 ${percent > 90 ? 'bg-rose-500' : 'bg-blue-500'}`} style={{ width: `${percent}%` }}></div>
                        </div>
                      </div>
                  );
                })}
                {budgets.length === 0 && <p className="text-gray-400 italic text-sm">Ліміти не встановлено</p>}
              </div>
              <div className="mt-10">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                        data={stats.categories}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                        nameKey="name" // Вказуємо, що назва категорії в полі "name"
                    >
                      {stats.categories.map((entry, i) => (
                          <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>

                    {/* Налаштування підказки при наведенні */}
                    <Tooltip
                        contentStyle={{
                          backgroundColor: darkMode ? '#1e293b' : '#fff',
                          border: 'none',
                          borderRadius: '10px',
                          color: darkMode ? '#fff' : '#000'
                        }}
                    />

                    {/* Легенда: відображає кольори та назви категорій */}
                    <Legend
                        verticalAlign="bottom"
                        align="center"
                        iconType="circle"
                        formatter={(value) => (
                            <span className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} text-xs font-medium`}>
            {value}
          </span>
                        )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* TABLE SECTION */}
            <div className={`lg:col-span-2 rounded-3xl shadow-sm border overflow-hidden ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
              <div className="p-6 border-b border-opacity-10 border-gray-500 flex flex-col md:flex-row justify-between items-center gap-4">
                <input
                    type="text" placeholder="🔍 Пошук..."
                    className={`p-3 rounded-2xl w-full md:max-w-xs outline-none transition ${darkMode ? 'bg-slate-700 border-transparent focus:bg-slate-600' : 'bg-gray-50 border focus:bg-white'}`}
                    onChange={e => setSearchTerm(e.target.value)}
                />
                <button
                    onClick={() => {setLoading(true); axios.post(`${API_URL}/sync`, {}, getAuthHeader()).then(() => loadData()).finally(() => setLoading(false))}}
                    className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg hover:bg-blue-700 transition-all w-full md:w-auto"
                >
                  {loading ? "..." : "Оновити"}
                </button>
              </div>
              <div className="max-h-[500px] overflow-y-auto">
                <table className="w-full text-left">
                  <thead className={`text-[10px] font-black uppercase tracking-widest sticky top-0 backdrop-blur-md ${darkMode ? 'bg-slate-800/80 text-gray-500' : 'bg-gray-50/80 text-gray-400'}`}>
                  <tr>
                    <th className="p-5">Дата</th>
                    <th className="p-5">Опис (тисни для ред.)</th>
                    <th className="p-5">Категорія</th>
                    <th className="p-5 text-right">Сума</th>
                  </tr>
                  </thead>
                  <tbody className="text-sm">
                  {filteredTransactions.map(tx => (
                      <tr key={tx.id} className={`border-b border-opacity-5 border-gray-500 hover:bg-opacity-5 hover:bg-gray-500 transition`}>
                        <td className="p-5 opacity-50">{new Date(tx.time).toLocaleDateString()}</td>
                        <td className="p-5 font-bold cursor-pointer hover:text-blue-500 transition-colors" onClick={() => editCategory(tx.id, tx.category)}>{tx.description}</td>
                        <td className="p-5 uppercase text-[9px] font-black tracking-tighter">
                          <span className="px-2 py-1 bg-blue-500 bg-opacity-10 text-blue-500 rounded-lg">{tx.category}</span>
                        </td>
                        <td className={`p-5 text-right font-black ${tx.amount < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                          {tx.amount > 0 ? `+${tx.amount.toFixed(2)}` : tx.amount.toFixed(2)} ₴
                        </td>
                      </tr>
                  ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}

export default App;