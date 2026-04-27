import { useEffect, useState } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8',
  '#82ca9d', '#FF6666', '#A020F0', '#FFA500', '#00CED1',
  '#F08080', '#DDA0DD', '#98FB98', '#FFD700', '#40E0D0',
  '#FF7F50', '#00FA9A', '#BA55D3', '#7B68EE', '#FF1493'
];
const API_URL = "http://127.0.0.1:8000";

function App() {
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState({ categories: [], total_income: 0, total_expenses: 0 });
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [days, setDays] = useState(30);
  const [darkMode, setDarkMode] = useState(localStorage.getItem('theme') === 'dark');

  const [token, setToken] = useState(localStorage.getItem('token'));
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState("");

  const [monoToken, setMonoToken] = useState("");
  const [monoAccId, setMonoAccId] = useState("");
  const [accounts, setAccounts] = useState([]); // Стан для списку карток

  const getAuthHeader = () => ({ headers: { Authorization: `Bearer ${token}` } });

  const loadData = async () => {
    if (!token) return;
    try {
      const [resTx, resStats, resBudgets] = await Promise.all([
         axios.get(`${API_URL}/transactions?days=${days}`, getAuthHeader()),
         axios.get(`${API_URL}/stats?days=${days}`, getAuthHeader()),
         axios.get(`${API_URL}/budgets`, getAuthHeader())
      ]);
      setTransactions(resTx.data);
      setStats(resStats.data);
      setBudgets(resBudgets.data);
    } catch (e) {
      if (e.response?.status === 401) handleLogout();
    }
  };

  // Функція для завантаження списку карток з банку
  const fetchAccounts = async () => {
    if (!monoToken) {
      alert("Спочатку введіть токен Monobank");
      return;
    }
    try {
      const res = await axios.get(`${API_URL}/monobank/accounts?token=${monoToken}`, getAuthHeader());
      setAccounts(res.data);
      if (res.data.length > 0) {
        setMonoAccId(res.data[0].id); // Вибираємо першу картку автоматично
      }
    } catch (e) {
      alert("Не вдалося завантажити картки. Перевірте токен.");
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

  const deleteBudget = async (id) => {
    if (window.confirm("Видалити цей ліміт?")) {
      await axios.delete(`${API_URL}/budgets/${id}`, getAuthHeader());
      loadData();
    }
  };

  const updateBudget = async (id, currentAmount) => {
    const newAmt = prompt("Вкажіть нову суму ліміту:", currentAmount);
    if (newAmt && !isNaN(newAmt)) {
      await axios.put(`${API_URL}/budgets/${id}`, { limit_amount: parseFloat(newAmt) }, getAuthHeader());
      loadData();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setTransactions([]);
  };

  const filteredTransactions = transactions
    .filter(tx =>
        tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.category.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => new Date(b.time) - new Date(a.time));

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

          {/* SETTINGS PANEL - СТИЛЬНИЙ ДИЗАЙН */}
          {showSettings && (
              <div className={`mb-8 p-6 rounded-3xl shadow-2xl border animate-in slide-in-from-top duration-500 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-blue-600 border-blue-500'} text-white`}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-white/10 rounded-lg">⚙️</div>
                  <h2 className="text-xl font-bold">Налаштування Monobank</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Блок Токена */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-1">Персональний API Токен</label>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        placeholder="Введіть X-Token..."
                        className={`flex-1 p-3 rounded-2xl outline-none transition-all ${darkMode ? 'bg-slate-700 focus:bg-slate-600' : 'bg-white/20 focus:bg-white/30'} text-white placeholder:text-white/40`}
                        value={monoToken}
                        onChange={e => setMonoToken(e.target.value)}
                      />
                      <button
                        onClick={fetchAccounts}
                        className="bg-blue-500 hover:bg-blue-400 text-white px-5 rounded-2xl font-bold transition shadow-lg active:scale-95"
                      >
                        Знайти
                      </button>
                    </div>
                  </div>

                  {/* Блок Вибору Картки */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-1">Оберіть рахунок</label>
                    <select
                      className={`p-3 rounded-2xl outline-none cursor-pointer transition-all ${darkMode ? 'bg-slate-700 focus:bg-slate-600' : 'bg-white/20 focus:bg-white/30'} text-white`}
                      value={monoAccId}
                      onChange={e => setMonoAccId(e.target.value)}
                      disabled={accounts.length === 0}
                    >
                      {accounts.length === 0 ? (
                        <option className="text-slate-900">Спочатку натисніть "Знайти"</option>
                      ) : (
                        accounts.map(acc => (
                          <option key={acc.id} value={acc.id} className="text-slate-900">
                            {acc.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                <button
                  onClick={async () => {
                    await axios.post(`${API_URL}/settings`, { mono_token: monoToken, mono_account_id: monoAccId }, getAuthHeader());
                    setShowSettings(false);
                    loadData();
                  }}
                  className={`w-full p-4 rounded-2xl font-black uppercase tracking-widest transition-all ${!monoAccId ? 'bg-gray-500/50 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-400 shadow-xl active:scale-[0.98]'}`}
                  disabled={!monoAccId}
                >
                  Зберегти конфігурацію
                </button>
              </div>
          )}

          {/* DATE FILTER BUTTONS */}
          <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
            {[7, 30].map(d => (
                <button
                    key={d} onClick={() => setDays(d)}
                    className={`px-6 py-2 rounded-full font-bold transition whitespace-nowrap ${days === d ? 'bg-blue-600 text-white shadow-lg' : (darkMode ? 'bg-slate-800 text-gray-400' : 'bg-white text-gray-500 shadow-sm')}`}
                >
                  {`${d} днів`}
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
                      <div key={b.id} className="group">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase mb-1">
                          <div className="flex items-center gap-2">
                            <button onClick={() => deleteBudget(b.id)} className="text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                            <span>{b.category}</span>
                          </div>
                          <span
                            onClick={() => updateBudget(b.id, b.limit_amount)}
                            className={`cursor-pointer hover:text-blue-500 transition-colors ${percent > 90 ? 'text-rose-500' : ''}`}
                          >
                            {spent.toFixed(0)} / {b.limit_amount} ₴
                          </span>
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
                        nameKey="name"
                    >
                      {stats.categories.map((entry, i) => (
                          <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                          backgroundColor: darkMode ? '#1e293b' : '#fff',
                          border: 'none',
                          borderRadius: '10px',
                          color: darkMode ? '#fff' : '#000'
                        }}
                    />
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
              <div className="max-h-[500px] overflow-y-auto text-center">
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
                      <tr key={tx.id}
                          className={`border-b border-opacity-5 border-gray-500 hover:bg-opacity-5 hover:bg-gray-500 transition`}>
                        <td className="p-5 opacity-50">{new Date(tx.time).toLocaleDateString()}</td>
                        <td className="p-5 font-bold cursor-pointer hover:text-blue-500 transition-colors"
                            onClick={() => editCategory(tx.id, tx.category)}>{tx.description}</td>
                        <td className="p-5 uppercase text-[10px] font-black tracking-tight">
                            <span className="px-2 py-1 bg-blue-600 text-white rounded-lg shadow-sm">
                              {tx.category || "БЕЗ КАТЕГОРІЇ"}
                            </span>
                        </td>
                        <td className={`p-5 text-right font-black ${tx.amount < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                          {tx.amount > 0 ? `+${tx.amount.toFixed(2)}` : tx.amount.toFixed(2)} ₴
                        </td>
                      </tr>
                  ))}
                  {filteredTransactions.length === 0 && (
                    <tr>
                      <td colSpan="4" className="p-10 text-center text-gray-500 italic font-medium">За вашим запитом нічого не знайдено</td>
                    </tr>
                  )}
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