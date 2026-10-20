import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FaCalendarAlt, FaPlus, FaTrash } from 'react-icons/fa';
import { toast } from 'react-toastify';
import API from '../../../api';

const academicYearFor = (date = new Date()) => {
  const year = date.getFullYear();
  return `${year}-${year + 1}`;
};

const academicYears = () => {
  const current = Number(academicYearFor().slice(0, 4));
  return Array.from({ length: 5 }, (_, index) => {
    const year = current - 3 + index;
    return `${year}-${year + 1}`;
  });
};

const Holidays = () => {
  const [academicYear, setAcademicYear] = useState(academicYearFor());
  const [holidays, setHolidays] = useState([]);
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(false);
  const currentAcademicYear = useRef(academicYearFor());

  useEffect(() => {
    const timer = window.setInterval(() => {
      const nextAcademicYear = academicYearFor();
      if (nextAcademicYear === currentAcademicYear.current) return;
      setAcademicYear((selectedYear) => selectedYear === currentAcademicYear.current ? nextAcademicYear : selectedYear);
      currentAcademicYear.current = nextAcademicYear;
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const range = useMemo(() => {
    const start = Number(academicYear.slice(0, 4));
    return { min: `${start}-01-01`, max: `${start}-12-31` };
  }, [academicYear]);

  const load = async () => {
    try {
      const response = await API.get('/holidays', { params: { academicYear } });
      setHolidays(response.data.holidays || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load holidays');
    }
  };

  useEffect(() => { load(); }, [academicYear]);

  const request = async (url, body, success) => {
    try {
      setLoading(true);
      await API.post(url, body);
      toast.success(success);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to save holiday');
    } finally { setLoading(false); }
  };

  const addHoliday = (event) => {
    event.preventDefault();
    request('/holidays', { name, holiday_date: date, academic_year: academicYear }, 'Government holiday added').then(() => {
      setName('');
      setDate('');
    });
  };

  const remove = async (id) => {
    if (!window.confirm('Remove this holiday?')) return;
    try {
      await API.delete(`/holidays/${id}`);
      toast.success('Holiday removed');
      await load();
    } catch (error) { toast.error(error.response?.data?.message || 'Unable to remove holiday'); }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Holidays</h1>
            <p className="mt-1 text-slate-600">Holidays are excluded from student leave days.</p>
          </div>
        </div>

        <section className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <label className="block text-sm font-medium text-slate-700">Academic year
              <select value={academicYear} onChange={(event) => setAcademicYear(event.target.value)} className="mt-2 block w-48 rounded-lg border border-slate-300 p-3">
                {academicYears().map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
            </label>
            <div className="flex flex-wrap gap-3">
              <button disabled={loading} onClick={() => request('/holidays/add-sundays', { academic_year: academicYear }, 'All Sundays added')} className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-60">Add all Sundays</button>
              <button disabled={loading} onClick={() => request('/holidays/add-third-saturdays', { academic_year: academicYear }, 'All third Saturdays added')} className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-60">Add third Saturdays</button>
            </div>
          </div>
        </section>

        <form onSubmit={addHoliday} className="mb-6 grid gap-4 rounded-2xl bg-white p-5 shadow-sm md:grid-cols-[1fr_1fr_auto]">
          <label className="text-sm font-medium text-slate-700">Holiday name
            <input required value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Independence Day" className="mt-2 block w-full rounded-lg border border-slate-300 p-3" />
          </label>
          <label className="text-sm font-medium text-slate-700">Date
            <input required type="date" min={range.min} max={range.max} value={date} onChange={(event) => setDate(event.target.value)} className="mt-2 block w-full rounded-lg border border-slate-300 p-3" />
          </label>
          <button disabled={loading} className="self-end rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white disabled:opacity-60"><FaPlus className="mr-2 inline" />Add Holiday</button>
        </form>

        <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-slate-100 text-slate-700"><tr><th className="p-4">Holiday</th><th className="p-4">Date</th><th className="p-4">Type</th><th className="p-4 text-right">Action</th></tr></thead>
            <tbody>
              {holidays.length === 0 ? <tr><td colSpan="4" className="p-10 text-center text-slate-500"><FaCalendarAlt className="mb-2 inline" /> No holidays added for this academic year.</td></tr> : holidays.map((holiday) => (
                <tr key={holiday.id} className="border-t border-slate-100"><td className="p-4 font-medium text-slate-800">{holiday.name}</td><td className="p-4">{holiday.holiday_date}</td><td className="p-4 capitalize">{holiday.holiday_type.replace('_', ' ')}</td><td className="p-4 text-right"><button onClick={() => remove(holiday.id)} className="text-red-600" aria-label={`Remove ${holiday.name}`}><FaTrash /></button></td></tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
};

export default Holidays;
