import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';
type Category = { id:string; name:string; description:string };
type Row = { year:number; region:string; institution:string; specialty:string; women:string; men:string; nonbinary:string; total:string };
function percent(a:number,b:number) { return b ? Math.round(a / b * 100) : 0; }

function App() {
  const [categories, setCategories] = useState<Category[]>([]); const [categoryId,setCategoryId] = useState('');
  const [rows,setRows] = useState<Row[]>([]); const [message,setMessage] = useState('');
  useEffect(()=>{ fetch(`${API}/categories`).then(r=>r.json()).then((x:Category[])=>{setCategories(x);setCategoryId(x[0]?.id || '');}).catch(()=>setMessage('API недоступне. Запустіть сервер і базу даних.')); },[]);
  useEffect(()=>{ if(categoryId) fetch(`${API}/dashboard?categoryId=${categoryId}`).then(r=>r.json()).then(setRows).catch(()=>setRows([])); },[categoryId]);
  const summary=useMemo(()=>rows.reduce((a,r)=>({women:a.women+Number(r.women),men:a.men+Number(r.men),nonbinary:a.nonbinary+Number(r.nonbinary)}),{women:0,men:0,nonbinary:0}),[rows]);
  const total=summary.women+summary.men+summary.nonbinary;
  return <main>
    <header><div><span className="eyebrow">IT education observatory</span><h1>Ґендерний баланс в ІТ-освіті</h1><p>Агрегована статистика для дослідження доступності та інклюзивності.</p></div><button onClick={()=>setMessage('Форма реєстрації підключається до POST /auth/register.')}>Увійти / реєстрація</button></header>
    <section className="filters"><label>Джерело даних<select value={categoryId} onChange={e=>setCategoryId(e.target.value)}>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><p>{categories.find(c=>c.id===categoryId)?.description}</p></section>
    {message && <p className="notice">{message}</p>}
    <section className="cards"><article><span>Усього записів</span><strong>{total.toLocaleString('uk-UA')}</strong></article><article><span>Частка жінок</span><strong>{percent(summary.women,total)}%</strong></article><article><span>Частка чоловіків</span><strong>{percent(summary.men,total)}%</strong></article><article><span>Гендерний індекс</span><strong>{summary.men ? (summary.women/summary.men).toFixed(2) : '—'}</strong></article></section>
    <section className="panel"><h2>Розподіл за закладами та роками</h2><div className="legend"><i className="women"/>Жінки <i className="men"/>Чоловіки <i className="nonbinary"/>Інші / не бінарні</div>{rows.length ? <div className="bars">{rows.map((r,i)=>{const t=Number(r.total);return <div className="bar-row" key={i}><span>{r.institution}<small>{r.year} · {r.region}</small></span><div className="stack"><b className="women" style={{width:`${percent(Number(r.women),t)}%`}}/><b className="men" style={{width:`${percent(Number(r.men),t)}%`}}/><b className="nonbinary" style={{width:`${percent(Number(r.nonbinary),t)}%`}}/></div><em>{t}</em></div>})}</div> : <p>Для цього джерела ще немає активних наборів даних.</p>}</section>
    <section className="consent"><h2>Додати власну статистику</h2><p>Зареєстровані користувачі можуть за добровільною згодою заповнити профіль. У публічних дашбордах відображаються лише агреговані дані.</p><button onClick={()=>setMessage('Після авторизації використовуйте PUT /profile/statistics із підтвердженням згоди.')}>Заповнити профіль</button></section>
  </main>;
}
createRoot(document.getElementById('root')!).render(<App/>);
