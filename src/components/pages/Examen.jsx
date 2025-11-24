import React, { useEffect, useState } from 'react';
import axios from 'axios';

const Examen = () => {
  const [examens, setExamens] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [form, setForm] = useState({
    idConsult: '',
    typeExamen: '',
    dateExamen: '',
    resultat: ''
  });
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Charger les examens et consultations
  const fetchExamens = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:3001/examens');
      setExamens(res.data);
    } catch {
      setError("Erreur lors du chargement des examens.");
    }
    setLoading(false);
  };

  const fetchConsultations = async () => {
    try {
      const res = await axios.get('http://localhost:3001/consultations');
      setConsultations(res.data);
    } catch {
      setConsultations([]);
    }
  };

  useEffect(() => {
    fetchExamens();
    fetchConsultations();
  }, []);

  // Gérer le changement de formulaire
  const handleChange = e => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Ajouter ou modifier un examen
  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    if (!form.idConsult || !form.typeExamen || !form.dateExamen) {
      setError("Tous les champs sauf résultat sont obligatoires.");
      return;
    }
    try {
      if (editingId) {
        await axios.put(`http://localhost:3001/examens/${editingId}`, form);
        setMessage("Examen modifié !");
      } else {
        await axios.post('http://localhost:3001/examens', form);
        setMessage("Examen ajouté !");
      }
      setForm({ idConsult: '', typeExamen: '', dateExamen: '', resultat: '' });
      setEditingId(null);
      fetchExamens();
      setTimeout(() => setMessage(''), 2000);
    } catch {
      setError("Erreur lors de l'enregistrement.");
    }
  };

  // Préparer la modification
  const handleEdit = (examen) => {
    setForm({
      idConsult: examen.idConsult,
      typeExamen: examen.typeExamen,
      dateExamen: examen.dateExamen ? examen.dateExamen.slice(0, 16) : '',
      resultat: examen.resultat || ''
    });
    setEditingId(examen.idExamen);
    setError('');
  };

  // Annuler la modification
  const handleCancelEdit = () => {
    setForm({ idConsult: '', typeExamen: '', dateExamen: '', resultat: '' });
    setEditingId(null);
    setError('');
  };

  // Supprimer un examen
  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer cet examen ?")) return;
    try {
      await axios.delete(`http://localhost:3001/examens/${id}`);
      setMessage("Examen supprimé !");
      fetchExamens();
      setTimeout(() => setMessage(''), 2000);
    } catch {
      setError("Erreur lors de la suppression.");
    }
  };

  // Trouver la consultation liée
  const getConsultDetails = (idConsult) => {
    const c = consultations.find(c => c.idConsult === idConsult);
    return c ? `ID: ${c.idConsult} | Date: ${c.dateConsult}` : idConsult;
  };

  return (
    <div className="max-w-[1800px] mx-auto mt-10 bg-white dark:bg-gray-900 p-8 rounded-xl shadow-2xl border border-blue-100">
      <h2 className="text-2xl font-bold mb-6 text-blue-700 dark:text-blue-300 text-center">Gestion des examens</h2>
      {message && (
        <div className="mb-4 px-3 py-2 bg-green-100 text-green-700 rounded text-center">{message}</div>
      )}
      {error && (
        <div className="mb-4 px-3 py-2 bg-red-100 text-red-700 rounded text-center">{error}</div>
      )}
      {loading && (
        <div className="mb-4 px-3 py-2 bg-blue-100 text-blue-700 rounded text-center">Chargement...</div>
      )}

      {/* Formulaire d'ajout/modification */}
      <form onSubmit={handleSubmit} className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
        <select
          name="idConsult"
          value={form.idConsult}
          onChange={handleChange}
          required
          className="p-2 rounded border border-blue-300 text-gray-700 font-bold bg-gray-100"
        >
          <option value="">Sélectionner une consultation</option>
          {consultations.map(c => (
            <option key={c.idConsult} value={c.idConsult}>
              {getConsultDetails(c.idConsult)}
            </option>
          ))}
        </select>
        <input
          type="text"
          name="typeExamen"
          value={form.typeExamen}
          onChange={handleChange}
          placeholder="Type d'examen"
          required
          className="p-2 rounded border border-blue-300"
        />
        <input
          type="datetime-local"
          name="dateExamen"
          value={form.dateExamen}
          onChange={handleChange}
          required
          className="p-2 rounded border border-blue-300"
        />
        <input
          type="text"
          name="resultat"
          value={form.resultat}
          onChange={handleChange}
          placeholder="Résultat"
          className="p-2 rounded border border-blue-300"
        />
        <div className="flex gap-2 md:col-span-4">
          <button
            type="submit"
            className="px-4 py-2 rounded bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all"
          >
            {editingId ? "Modifier" : "Ajouter"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="px-4 py-2 rounded bg-gray-400 text-white font-bold hover:bg-gray-500 transition-all"
            >
              Annuler
            </button>
          )}
        </div>
      </form>

      {/* Tableau des examens */}
      <div className="overflow-x-auto rounded-xl shadow-2xl border border-blue-100">
        <table className="min-w-[1500px] w-full border-collapse text-base bg-white dark:bg-gray-900 rounded-xl overflow-hidden">
          <thead className="bg-blue-600 text-white text-lg">
            <tr>
              <th className="p-5 text-left font-bold">ID Examen</th>
              <th className="p-5 text-left font-bold">Consultation</th>
              <th className="p-5 text-left font-bold">Type</th>
              <th className="p-5 text-left font-bold">Date</th>
              <th className="p-5 text-left font-bold">Résultat</th>
              <th className="p-5 text-center font-bold">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-blue-50 dark:divide-gray-800 text-lg">
            {examens.map(examen => (
              <tr key={examen.idExamen} className="hover:bg-blue-50 dark:hover:bg-gray-800 transition">
                <td className="p-5 font-semibold">{examen.idExamen}</td>
                <td className="p-5">{getConsultDetails(examen.idConsult)}</td>
                <td className="p-5">{examen.typeExamen}</td>
                <td className="p-5">{examen.dateExamen ? examen.dateExamen.replace('T', ' ').slice(0, 16) : ''}</td>
                <td className="p-5">{examen.resultat}</td>
                <td className="p-5 flex gap-2 justify-center">
                  <button
                    onClick={() => handleEdit(examen)}
                    className="px-4 py-2 rounded bg-yellow-500 text-white font-bold hover:bg-yellow-600 transition-all text-base"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDelete(examen.idExamen)}
                    className="px-4 py-2 rounded bg-red-600 text-white font-bold hover:bg-red-700 transition-all text-base"
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Examen;