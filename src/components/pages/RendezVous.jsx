import React, { useEffect, useState } from 'react';
import axios from 'axios';
// L'import de la librairie XLSX est maintenu pour la logique, mais doit être géré dans l'environnement d'exécution.
import * as XLSX from "xlsx"; 
import { Plus, Search, Edit2, Trash2, ChevronUp, ChevronDown, RefreshCw, Check, X, CalendarCheck, CalendarX, Clock4, Download } from 'lucide-react';

export default function Rendezvous() {
  const [rdvs, setRdvs] = useState([]);
  const [patients, setPatients] = useState([]);
  const [praticiens, setPraticiens] = useState([]);
  const [form, setForm] = useState({
    idRdv: null,
    cinPatient: '',
    cinPraticien: '',
    dateHeure: '',
    statut: 'en_attente',
    idRdvParent: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [search, setSearch] = useState({ patient: '', praticien: '', statut: '' });
  const [sortField, setSortField] = useState('dateHeure');
  const [sortOrder, setSortOrder] = useState('asc');
  const [page, setPage] = useState(1);
  const [perPage] = useState(6);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const [loading, setLoading] = useState(false);

  // --- Gestion des Notifications ---
  const handleError = (msg) => {
    setNotification({ show: true, message: msg, type: 'error' });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3000);
  };
  const handleSuccess = (msg) => {
    setNotification({ show: true, message: msg, type: 'success' });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 2000);
  };

  // --- Fetch Data ---
  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = () => {
    setLoading(true);
    Promise.all([
      axios.get('http://localhost:3001/rendezvous'),
      axios.get('http://localhost:3001/patients'),
      axios.get('http://localhost:3001/praticiens')
    ])
      .then(([rdvRes, patRes, pratRes]) => {
        setRdvs(rdvRes.data);
        setPatients(patRes.data);
        setPraticiens(pratRes.data);
      })
      .catch(() => handleError("Erreur lors du chargement des données. Vérifiez l'API."))
      .finally(() => setLoading(false));
  };

  // --- Form & Action Handlers ---
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSearchChange = (e) => {
    setSearch(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setPage(1);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setShowAddForm(false);
    setForm({ idRdv: null, cinPatient: '', cinPraticien: '', dateHeure: '', statut: 'en_attente', idRdvParent: '' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const method = isEditing ? 'put' : 'post';
    const url = isEditing
      ? `http://localhost:3001/rendezvous/${form.idRdv}`
      : `http://localhost:3001/rendezvous`;

    axios[method](url, form)
      .then(() => {
        fetchAll();
        handleCancel();
        handleSuccess(isEditing ? "Rendez-vous modifié avec succès" : "Rendez-vous ajouté avec succès");
      })
      .catch(() => handleError("Erreur lors de l'enregistrement du rendez-vous."));
  };

  const handleEdit = (rdv) => {
    // Formater la date pour l'input datetime-local
    const formattedDate = new Date(rdv.dateHeure).toISOString().slice(0, 16);
    setForm({ ...rdv, dateHeure: formattedDate });
    setIsEditing(true);
    setShowAddForm(true); // Ouvre le formulaire pour l'édition
  };

  const handleDelete = (id) => {
    if (window.confirm("⚠️ Voulez-vous vraiment supprimer ce rendez-vous ? Cette action est irréversible.")) {
      axios.delete(`http://localhost:3001/rendezvous/${id}`)
        .then(() => {
          fetchAll();
          handleSuccess("Rendez-vous supprimé avec succès");
        })
        .catch(() => handleError("Erreur lors de la suppression."));
    }
  };

  const handleExportExcel = () => {
      // Pour s'assurer que les données exportées sont lisibles
      const dataToExport = filteredRdvs.map(r => ({
          'ID RDV': r.idRdv,
          'Patient': getPatientName(r.cinPatient),
          'Praticien': getPraticienName(r.cinPraticien),
          'Date & Heure': new Date(r.dateHeure).toLocaleString('fr-FR'),
          'Statut': r.statut,
          'ID Parent': r.idRdvParent || '-'
      }));
      
      // La vérification de XLSX est nécessaire pour l'environnement de compilation
      if (typeof XLSX === 'undefined') {
          handleError("Librairie XLSX non chargée. Exportation impossible.");
          return;
      }
      
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "RendezVous");
      XLSX.writeFile(wb, "rendezvous_export.xlsx");
      handleSuccess("Exportation Excel réussie.");
  };

  // --- Filtering, Sorting, Pagination Logic & Utilities ---
  
  const getPatientName = (cin) => {
    const p = patients.find(p => p.cinPatient === cin);
    return p ? `${p.nom} ${p.prenom}` : cin;
  };
  const getPraticienName = (cin) => {
    const pr = praticiens.find(pr => pr.cinPraticien === cin);
    return pr ? `${pr.nom} ${pr.prenom}` : cin;
  };
  
  const filteredRdvs = rdvs
    .filter(r =>
      (search.patient === '' || (getPatientName(r.cinPatient) || '').toLowerCase().includes(search.patient.toLowerCase())) &&
      (search.praticien === '' || (getPraticienName(r.cinPraticien) || '').toLowerCase().includes(search.praticien.toLowerCase())) &&
      (search.statut === '' || r.statut === search.statut)
    )
    .sort((a, b) => {
      const aVal = a[sortField] || '';
      const bVal = b[sortField] || '';

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return sortOrder === 'asc'
        ? aVal - bVal
        : bVal - aVal;
    });

  const totalPages = Math.ceil(filteredRdvs.length / perPage);
  const paginatedRdvs = filteredRdvs.slice((page - 1) * perPage, page * perPage);

  const statutColor = (statut) => {
    switch (statut) {
      case "confirme":
        return "bg-emerald-100 text-emerald-700 border-emerald-300";
      case "annule":
        return "bg-red-100 text-red-700 border-red-300";
      default:
        return "bg-amber-100 text-amber-700 border-amber-300";
    }
  };

  const StatutIcon = ({ statut }) => {
    switch (statut) {
      case "confirme":
        return <CalendarCheck className="w-4 h-4 mr-1 text-emerald-600" />;
      case "annule":
        return <CalendarX className="w-4 h-4 mr-1 text-red-600" />;
      default:
        return <Clock4 className="w-4 h-4 mr-1 text-amber-600" />;
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc'
      ? <ChevronUp className="w-4 h-4 inline-block ml-1" />
      : <ChevronDown className="w-4 h-4 inline-block ml-1" />;
  };

  return (
    <div className="p-4 bg-gray-50 min-h-screen text-gray-800 max-w-[1800px] mx-auto">
      
      {/* Notifications */}
      {notification.show && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-xl shadow-2xl font-semibold text-white flex items-center gap-2 transform transition-all duration-300 ease-in-out ${notification.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {notification.type === 'success' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
          {notification.message}
        </div>
      )}

      {/* Titre */}
      <h1 className="text-3xl font-extrabold mb-8 text-sky-700 text-center border-b-2 border-sky-200 pb-3">
        Gestion des Rendez-vous Médicaux 📅
      </h1>

      {/* Zone de Recherche et Actions */}
      <div className="bg-white p-6 rounded-2xl shadow-xl mb-6 border border-sky-100 animate-fade-in-up">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-4">
          <p className='text-gray-600 font-semibold flex items-center gap-2'>
            <Search className="w-5 h-5 text-sky-500" /> Filtrer par:
          </p>
          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <input
              type="text"
              placeholder="Nom Patient"
              className="w-full sm:w-40 px-4 py-2 rounded-xl border border-gray-300 bg-gray-50 text-gray-800 placeholder-gray-500 focus:ring-2 focus:ring-sky-300 transition-all shadow-sm outline-none"
              value={search.patient}
              name="patient"
              onChange={handleSearchChange}
            />
            <input
              type="text"
              placeholder="Nom Praticien"
              className="w-full sm:w-40 px-4 py-2 rounded-xl border border-gray-300 bg-gray-50 text-gray-800 placeholder-gray-500 focus:ring-2 focus:ring-sky-300 transition-all shadow-sm outline-none"
              value={search.praticien}
              name="praticien"
              onChange={handleSearchChange}
            />
            <select
              name="statut"
              value={search.statut}
              onChange={handleSearchChange}
              className="w-full sm:w-36 px-4 py-2 rounded-xl border border-gray-300 bg-gray-50 text-gray-800 focus:ring-2 focus:ring-sky-300 transition-all shadow-sm outline-none"
            >
              <option value="">Tous statuts</option>
              <option value="en_attente">En attente</option>
              <option value="confirme">Confirmé</option>
              <option value="annule">Annulé</option>
            </select>
          </div>
        </div>
        
        <div className="flex gap-3 mt-4 justify-end flex-wrap">
            <button
              onClick={handleExportExcel}
              className="flex items-center bg-emerald-600 text-white font-semibold px-4 py-2 rounded-xl shadow-md hover:bg-emerald-700 transition-all duration-300"
              title="Exporter le tableau actuel en format Excel"
            >
                <Download className="w-5 h-5 mr-2" />
                Export Excel
            </button>
            <button
              onClick={() => { setShowAddForm(!showAddForm); setIsEditing(false); handleCancel(); }}
              className="flex items-center bg-sky-600 text-white font-semibold px-4 py-2 rounded-xl shadow-md hover:bg-sky-700 transition-all duration-300"
              title={showAddForm ? "Fermer le formulaire" : "Ajouter un nouveau rendez-vous"}
            >
              {showAddForm ? <X className="w-5 h-5 mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
              {showAddForm ? 'Fermer' : 'Ajouter RDV'}
            </button>
            <button
              onClick={fetchAll}
              className="flex items-center bg-indigo-600 text-white font-semibold px-4 py-2 rounded-xl shadow-md hover:bg-indigo-700 transition-all duration-300"
              title="Rafraîchir les données"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
        </div>
      </div>

      {/* Formulaire d'Ajout/Modification */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-xl mb-8 space-y-6 border border-sky-200 animate-fade-in-up">
          <h3 className="text-2xl font-bold text-sky-700">{isEditing ? 'Modifier le Rendez-vous' : 'Ajouter un Nouveau Rendez-vous'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">Patient*</label>
                <select
                  name="cinPatient"
                  value={form.cinPatient}
                  onChange={handleChange}
                  className="border border-gray-300 bg-gray-50 rounded-lg px-4 py-2.5 focus:ring-sky-400 focus:border-sky-400 text-gray-800 transition"
                  required
                >
                  <option value="" disabled>Sélectionner un patient</option>
                  {patients.map(p => (
                    <option key={p.cinPatient} value={p.cinPatient}>
                      {p.cinPatient} - {p.nom} {p.prenom}
                    </option>
                  ))}
                </select>
            </div>

            <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">Praticien*</label>
                <select
                  name="cinPraticien"
                  value={form.cinPraticien}
                  onChange={handleChange}
                  className="border border-gray-300 bg-gray-50 rounded-lg px-4 py-2.5 focus:ring-sky-400 focus:border-sky-400 text-gray-800 transition"
                  required
                >
                  <option value="" disabled>Sélectionner un praticien</option>
                  {praticiens.map(pr => (
                    <option key={pr.cinPraticien} value={pr.cinPraticien}>
                      {pr.cinPraticien} - {pr.nom} {pr.prenom}
                    </option>
                  ))}
                </select>
            </div>
            
            <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">Date et Heure*</label>
                <input name="dateHeure" type="datetime-local" value={form.dateHeure} onChange={handleChange} 
                  className="border border-gray-300 bg-gray-50 rounded-lg px-4 py-2.5 focus:ring-sky-400 focus:border-sky-400 text-gray-800 transition" required />
            </div>

            <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">Statut*</label>
                <select name="statut" value={form.statut} onChange={handleChange} 
                  className="border border-gray-300 bg-gray-50 rounded-lg px-4 py-2.5 focus:ring-sky-400 focus:border-sky-400 text-gray-800 transition">
                  <option value="en_attente">En attente</option>
                  <option value="confirme">Confirmé</option>
                  <option value="annule">Annulé</option>
                </select>
            </div>

            <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">ID Parent (Optionnel)</label>
                <input name="idRdvParent" placeholder="ID Parent" value={form.idRdvParent} onChange={handleChange} 
                  className="border border-gray-300 bg-gray-50 rounded-lg px-4 py-2.5 focus:ring-sky-400 focus:border-sky-400 text-gray-800 transition" />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button type="submit" className={`flex items-center font-semibold px-6 py-2 rounded-xl transition-all shadow-md ${isEditing ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-sky-600 hover:bg-sky-700'} text-white`}>
                {isEditing ? <Edit2 className="w-5 h-5 mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
                {isEditing ? 'Mettre à jour' : 'Enregistrer RDV'}
            </button>
            <button type="button" onClick={handleCancel} className="flex items-center bg-gray-400 text-white font-semibold px-6 py-2 rounded-xl hover:bg-gray-500 transition-all shadow-md">
                <X className="w-5 h-5 mr-2" /> Annuler
            </button>
          </div>
        </form>
      )}

      {/* Tableau des Rendez-vous (Écran Large) */}
      <div className="hidden md:block mt-8 animate-fade-in-up">
        <div className="overflow-x-auto bg-white rounded-2xl shadow-xl border border-sky-100">
          <table className="min-w-[1400px] w-full text-sm">
            <thead>
              <tr className="bg-sky-500 text-white uppercase text-left font-semibold border-b border-sky-200">
                {['cinPatient', 'cinPraticien', 'dateHeure', 'statut', 'idRdvParent'].map(field => (
                  <th key={field} className="px-4 py-3 cursor-pointer hover:bg-sky-600 transition-all" onClick={() => handleSort(field)}>
                    {field.charAt(0).toUpperCase() + field.slice(1).replace('cinPatient', 'Patient').replace('cinPraticien', 'Praticien').replace('dateHeure', 'Date & Heure').replace('statut', 'Statut').replace('idRdvParent', 'ID Parent')} <SortIcon field={field} />
                  </th>
                ))}
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-sky-500 font-semibold flex items-center justify-center gap-2">
                    <Clock4 className="w-5 h-5 animate-spin" /> Chargement des données...
                  </td>
                </tr>
              ) : paginatedRdvs.length > 0 ? (
                paginatedRdvs.map((r, index) => (
                  <tr key={r.idRdv} className={`border-t border-gray-100 hover:bg-sky-50/50 transition-all duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-4 py-2 text-sky-700 font-medium">{getPatientName(r.cinPatient)}</td>
                    <td className="px-4 py-2">{getPraticienName(r.cinPraticien)}</td>
                    <td className="px-4 py-2">{new Date(r.dateHeure).toLocaleString('fr-FR')}</td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statutColor(r.statut)}`}>
                        <StatutIcon statut={r.statut} />
                        {r.statut === "en_attente" ? "En attente" : r.statut === "confirme" ? "Confirmé" : "Annulé"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-500 italic">{r.idRdvParent || '-'}</td>
                    <td className="px-4 py-2 space-x-2 flex justify-center">
                      <button onClick={() => handleEdit(r)} className="flex items-center bg-yellow-500 px-3 py-1 rounded-lg text-white hover:bg-yellow-600 transition-all text-xs shadow-md">
                        <Edit2 className="w-4 h-4 mr-1" /> Modifier
                      </button>
                      <button onClick={() => handleDelete(r.idRdv)} className="flex items-center bg-red-600 px-3 py-1 rounded-lg text-white hover:bg-red-700 transition-all text-xs shadow-md">
                        <Trash2 className="w-4 h-4 mr-1" /> Supprimer
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-gray-500">
                    <X className="w-5 h-5 inline-block mr-2 text-red-400" /> Aucun rendez-vous trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex justify-center items-center gap-4 mt-6">
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
          className="px-4 py-2 rounded-xl bg-sky-100 text-sky-700 hover:bg-sky-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-sm"
        >Précédent</button>
        <span className="font-bold text-sky-800 bg-white px-3 py-1 rounded-xl shadow-md border border-sky-200">{page} / {totalPages || 1}</span>
        <button
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page === totalPages || totalPages === 0}
          className="px-4 py-2 rounded-xl bg-sky-100 text-sky-700 hover:bg-sky-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-sm"
        >Suivant</button>
      </div>

      {/* Cartes Rendez-vous (Écran Mobile) */}
      <div className="md:hidden grid grid-cols-1 gap-4 mt-6 animate-fade-in-up">
        {loading ? (
          <div className="text-center text-sky-500 font-semibold">Chargement des rendez-vous...</div>
        ) : paginatedRdvs.length > 0 ? (
          paginatedRdvs.map(r => (
            <div
              key={r.idRdv}
              className="bg-white p-5 rounded-xl shadow-lg border border-sky-200 hover:shadow-xl transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-2 pb-2 border-b border-sky-100">
                <div>
                  <span className="font-extrabold text-lg text-sky-700 block">{getPatientName(r.cinPatient)}</span>
                  <span className="text-sm text-gray-500">avec {getPraticienName(r.cinPraticien)}</span>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statutColor(r.statut)} flex items-center`}>
                  <StatutIcon statut={r.statut} />
                  {r.statut === "en_attente" ? "En attente" : r.statut === "confirme" ? "Confirmé" : "Annulé"}
                </span>
              </div>
              <div className="text-gray-600 space-y-1">
                <p><strong>Date:</strong> <span className="font-medium text-gray-800">{new Date(r.dateHeure).toLocaleString('fr-FR')}</span></p>
                {r.idRdvParent && <p><strong>ID Parent:</strong> {r.idRdvParent}</p>}
              </div>
              <div className="flex gap-3 mt-4 justify-end">
                <button onClick={() => handleEdit(r)} className="flex items-center bg-yellow-500 px-3 py-1.5 rounded-lg text-white hover:bg-yellow-600 transition-all text-sm shadow-md">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(r.idRdv)} className="flex items-center bg-red-600 px-3 py-1.5 rounded-lg text-white hover:bg-red-700 transition-all text-sm shadow-md">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-5 text-gray-500 bg-white rounded-xl shadow-lg border border-sky-200">
            <X className="w-6 h-6 inline-block mr-2 text-red-400" /> Aucun rendez-vous trouvé.
          </div>
        )}
      </div>

      {/* Styles d'Animation */}
      <style>{`
        .animate-fade-in-up {
          animation: fadeInUp 0.7s;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px);}
          to { opacity: 1; transform: translateY(0);}
        }
      `}</style>
    </div>
  );
}