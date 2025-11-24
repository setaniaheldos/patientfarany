import React, { useEffect, useState } from 'react';
import axios from 'axios';
import * as XLSX from "xlsx";
import { UserPlus, Search, Edit2, Trash2, FileSpreadsheet, ChevronUp, ChevronDown, RefreshCw, X, Check, Clock } from 'lucide-react';

export default function Praticiens() {
  const [praticiens, setPraticiens] = useState([]);
  const [formData, setFormData] = useState({
    cinPraticien: '',
    nom: '',
    prenom: '',
    telephone: '',
    email: '',
    specialite: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState({ nom: '', prenom: '', specialite: '', email: '' });
  const [sortField, setSortField] = useState('nom');
  const [sortOrder, setSortOrder] = useState('asc');
  const [page, setPage] = useState(1);
  const [perPage] = useState(6);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const [loading, setLoading] = useState(false);

  // --- Gestion des Notifications ---
  const handleNotification = (msg, type) => {
    setNotification({ show: true, message: msg, type: type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), type === 'error' ? 3000 : 2000);
  };
  
  const handleError = (msg) => handleNotification(msg, 'error');
  const handleSuccess = (msg) => handleNotification(msg, 'success');

  // --- Fetch Data ---
  const fetchPraticiens = () => {
    setLoading(true);
    axios.get('http://localhost:3001/praticiens')
      .then(res => setPraticiens(res.data))
      .catch(() => handleError("Erreur lors du chargement des praticiens."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPraticiens();
  }, []);

  // --- Form Handlers ---
  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAddClick = () => {
    setFormData({ cinPraticien: '', nom: '', prenom: '', telephone: '', email: '', specialite: '' });
    setIsEditing(false);
    setShowForm(!showForm);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const method = isEditing ? 'put' : 'post';
    const url = `http://localhost:3001/praticiens${isEditing ? '/' + formData.cinPraticien : ''}`;

    axios[method](url, formData)
      .then(() => {
        fetchPraticiens();
        setFormData({ cinPraticien: '', nom: '', prenom: '', telephone: '', email: '', specialite: '' });
        setIsEditing(false);
        setShowForm(false);
        handleSuccess(isEditing ? "Praticien modifié avec succès." : "Praticien ajouté avec succès.");
      })
      .catch(() => handleError("Erreur lors de l'enregistrement du praticien. Vérifiez le CIN unique."));
  };

  const handleEdit = (p) => {
    if (window.confirm("⚠️ Confirmer la modification du dossier praticien ?")) {
      setFormData(p);
      setIsEditing(true);
      setShowForm(true);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setIsEditing(false);
    setFormData({ cinPraticien: '', nom: '', prenom: '', telephone: '', email: '', specialite: '' });
  };


  const handleDelete = (cinPraticien) => {
    if (window.confirm("⚠️ ATTENTION : La suppression est définitive. Voulez-vous vraiment continuer ?")) {
      axios.delete(`http://localhost:3001/praticiens/${cinPraticien}`)
        .then(() => {
          fetchPraticiens();
          handleSuccess("Praticien supprimé avec succès.");
        })
        .catch(() => handleError("Erreur lors de la suppression."));
    }
  };

  // --- Search, Sort & Pagination ---
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

  const filteredPraticiens = praticiens
    .filter(p =>
      p.nom.toLowerCase().includes(search.nom.toLowerCase()) &&
      p.prenom.toLowerCase().includes(search.prenom.toLowerCase()) &&
      p.specialite.toLowerCase().includes(search.specialite.toLowerCase()) &&
      p.email.toLowerCase().includes(search.email.toLowerCase())
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

  const totalPages = Math.ceil(filteredPraticiens.length / perPage);
  const paginatedPraticiens = filteredPraticiens.slice((page - 1) * perPage, page * perPage);

  // Export Excel
  const handleExportExcel = () => {
    const dataToExport = filteredPraticiens.map(({ cinPraticien, nom, prenom, telephone, email, specialite }) => ({
        CIN: cinPraticien,
        Nom: nom,
        Prénom: prenom,
        Téléphone: telephone,
        Email: email,
        Spécialité: specialite
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Praticiens");
    XLSX.writeFile(wb, "liste_praticiens.xlsx");
    handleSuccess("Fichier Excel généré avec succès.");
  };

  // Icone de tri
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
        Gestion des Praticiens 👨‍⚕️
      </h1>

      {/* Zone de Recherche et Actions */}
      <div className="bg-white p-6 rounded-2xl shadow-xl mb-6 border border-sky-100 animate-fade-in-up">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-4">
          <p className='text-gray-600 font-semibold flex items-center gap-2'>
            <Search className="w-5 h-5 text-sky-500" /> Recherche Avancée:
          </p>
          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <input
              type="text"
              placeholder="Nom"
              className="w-full sm:w-36 px-4 py-2 rounded-xl border border-gray-300 bg-gray-50 text-gray-800 placeholder-gray-500 focus:ring-2 focus:ring-sky-300 transition-all shadow-sm outline-none"
              value={search.nom}
              name="nom"
              onChange={handleSearchChange}
            />
            <input
              type="text"
              placeholder="Prénom"
              className="w-full sm:w-36 px-4 py-2 rounded-xl border border-gray-300 bg-gray-50 text-gray-800 placeholder-gray-500 focus:ring-2 focus:ring-sky-300 transition-all shadow-sm outline-none"
              value={search.prenom}
              name="prenom"
              onChange={handleSearchChange}
            />
            <input
              type="text"
              placeholder="Spécialité"
              className="w-full sm:w-36 px-4 py-2 rounded-xl border border-gray-300 bg-gray-50 text-gray-800 placeholder-gray-500 focus:ring-2 focus:ring-sky-300 transition-all shadow-sm outline-none"
              value={search.specialite}
              name="specialite"
              onChange={handleSearchChange}
            />
            <input
              type="text"
              placeholder="Email"
              className="w-full sm:w-36 px-4 py-2 rounded-xl border border-gray-300 bg-gray-50 text-gray-800 placeholder-gray-500 focus:ring-2 focus:ring-sky-300 transition-all shadow-sm outline-none"
              value={search.email}
              name="email"
              onChange={handleSearchChange}
            />
          </div>
        </div>
        
        <div className="flex gap-3 mt-4 justify-end">
            <button
              onClick={handleAddClick}
              className="flex items-center bg-sky-600 text-white font-semibold px-4 py-2 rounded-xl shadow-md hover:bg-sky-700 transition-all duration-300"
              title={showForm ? "Fermer le formulaire" : "Ajouter un nouveau praticien"}
            >
              {showForm ? <X className="w-5 h-5 mr-2" /> : <UserPlus className="w-5 h-5 mr-2" />}
              {showForm ? 'Fermer' : 'Ajouter'}
            </button>
            <button
              onClick={handleExportExcel}
              className="flex items-center bg-emerald-600 text-white font-semibold px-4 py-2 rounded-xl shadow-md hover:bg-emerald-700 transition-all duration-300"
              title="Exporter en Excel"
            >
              <FileSpreadsheet className="w-5 h-5 mr-2" /> Export Excel
            </button>
            <button
              onClick={fetchPraticiens}
              className="flex items-center bg-indigo-600 text-white font-semibold px-4 py-2 rounded-xl shadow-md hover:bg-indigo-700 transition-all duration-300"
              title="Rafraîchir les données"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
        </div>
      </div>

      {/* Formulaire d'Ajout/Modification */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-xl mb-8 space-y-6 border border-sky-200 animate-fade-in-up">
          <h3 className="text-2xl font-bold text-sky-700">{isEditing ? 'Modifier le Praticien' : 'Ajouter un Nouveau Praticien'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">CIN*</label>
                <input className="border border-gray-300 bg-gray-50 rounded-lg px-4 py-2.5 focus:ring-sky-400 focus:border-sky-400 text-gray-800 transition" name="cinPraticien" placeholder="CIN" value={formData.cinPraticien} onChange={handleChange} required disabled={isEditing} />
            </div>

            <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">Nom*</label>
                <input className="border border-gray-300 bg-gray-50 rounded-lg px-4 py-2.5 focus:ring-sky-400 focus:border-sky-400 text-gray-800 transition" name="nom" placeholder="Nom" value={formData.nom} onChange={handleChange} required />
            </div>
            
            <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">Prénom*</label>
                <input className="border border-gray-300 bg-gray-50 rounded-lg px-4 py-2.5 focus:ring-sky-400 focus:border-sky-400 text-gray-800 transition" name="prenom" placeholder="Prénom" value={formData.prenom} onChange={handleChange} required />
            </div>

            <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">Téléphone</label>
                <input className="border border-gray-300 bg-gray-50 rounded-lg px-4 py-2.5 focus:ring-sky-400 focus:border-sky-400 text-gray-800 transition" name="telephone" placeholder="Téléphone" value={formData.telephone} onChange={handleChange} />
            </div>

            <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">Email</label>
                <input className="border border-gray-300 bg-gray-50 rounded-lg px-4 py-2.5 focus:ring-sky-400 focus:border-sky-400 text-gray-800 transition" name="email" type="email" placeholder="Email" value={formData.email} onChange={handleChange} />
            </div>
            
            <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">Spécialité*</label>
                <select
                  className="border border-gray-300 bg-gray-50 rounded-lg px-4 py-2.5 focus:ring-sky-400 focus:border-sky-400 text-gray-800 transition"
                  name="specialite"
                  value={formData.specialite}
                  onChange={handleChange}
                  required
                >
                  <option value="" disabled className="text-gray-400">Sélectionner la spécialité</option>
                  <option value="Generaliste">Généraliste</option>
                  <option value="Specialiste">Spécialiste</option>
                </select>
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-4">
            <button type="submit" className={`flex items-center font-semibold px-6 py-2 rounded-xl transition-all shadow-md ${isEditing ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-sky-600 hover:bg-sky-700'} text-white`}>
                {isEditing ? <Edit2 className="w-5 h-5 mr-2" /> : <UserPlus className="w-5 h-5 mr-2" />}
                {isEditing ? 'Mettre à jour' : 'Enregistrer'}
            </button>
            <button type="button" onClick={handleCancel} className="flex items-center bg-gray-400 text-white font-semibold px-6 py-2 rounded-xl hover:bg-gray-500 transition-all shadow-md">
                <X className="w-5 h-5 mr-2" /> Annuler
            </button>
          </div>
        </form>
      )}

      {/* Tableau des Praticiens (Écran Large) */}
      <div className="hidden md:block mt-8 animate-fade-in-up">
        <div className="overflow-x-auto bg-white rounded-2xl shadow-xl border border-sky-100">
          <table className="min-w-[1200px] w-full text-sm">
            <thead>
              <tr className="bg-sky-50 text-sky-800 uppercase text-left font-semibold border-b border-sky-200">
                {/* En-têtes cliquables pour le tri */}
                {['cinPraticien', 'nom', 'prenom', 'telephone', 'email', 'specialite'].map(field => (
                  <th key={field} className="px-4 py-3 cursor-pointer hover:bg-sky-100 transition-all" onClick={() => handleSort(field)}>
                    {field.charAt(0).toUpperCase() + field.slice(1).replace('cinPraticien', 'CIN').replace('telephone', 'Téléphone')} <SortIcon field={field} />
                  </th>
                ))}
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-sky-500 font-semibold flex items-center justify-center gap-2">
                    <Clock className="w-5 h-5 animate-spin" /> Chargement des données...
                  </td>
                </tr>
              ) : paginatedPraticiens.length > 0 ? (
                paginatedPraticiens.map((p, index) => (
                  <tr key={p.cinPraticien} className={`border-t border-gray-100 hover:bg-sky-50/50 transition-all duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-4 py-2 font-medium text-sky-600">{p.cinPraticien}</td>
                    <td className="px-4 py-2">{p.nom}</td>
                    <td className="px-4 py-2">{p.prenom}</td>
                    <td className="px-4 py-2">{p.telephone}</td>
                    <td className="px-4 py-2">{p.email}</td>
                    <td className="px-4 py-2">
                        <span className="inline-block bg-sky-100 text-sky-700 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-sky-300">{p.specialite}</span>
                    </td>
                    <td className="px-4 py-2 space-x-2 flex justify-center">
                      <button onClick={() => handleEdit(p)} className="flex items-center bg-yellow-500 px-3 py-1 rounded-lg text-white hover:bg-yellow-600 transition-all text-xs shadow-md">
                        <Edit2 className="w-4 h-4 mr-1" /> Modifier
                      </button>
                      <button onClick={() => handleDelete(p.cinPraticien)} className="flex items-center bg-red-600 px-3 py-1 rounded-lg text-white hover:bg-red-700 transition-all text-xs shadow-md">
                        <Trash2 className="w-4 h-4 mr-1" /> Supprimer
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-gray-500">
                    <X className="w-5 h-5 inline-block mr-2 text-red-400" /> Aucun praticien trouvé.
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

      {/* Cartes Praticiens (Écran Mobile) */}
      <div className="md:hidden grid grid-cols-1 gap-4 mt-6 animate-fade-in-up">
        {loading ? (
          <div className="text-center text-sky-500 font-semibold">Chargement des dossiers...</div>
        ) : paginatedPraticiens.length > 0 ? (
          paginatedPraticiens.map((p) => (
            <div key={p.cinPraticien} className="bg-white p-5 rounded-xl shadow-lg border border-sky-200 hover:shadow-xl transition-all duration-200">
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-sky-100">
                <span className="font-extrabold text-lg text-sky-700">{p.nom} {p.prenom}</span>
                <span className="bg-sky-100 text-sky-700 px-3 py-1 rounded-full text-xs font-semibold border border-sky-300">{p.specialite}</span>
              </div>
              <div className="text-gray-600 space-y-1">
                <p><strong>CIN:</strong> <span className="font-medium text-gray-800">{p.cinPraticien}</span></p>
                <p><strong>Email:</strong> {p.email}</p>
                <p><strong>Téléphone:</strong> {p.telephone}</p>
              </div>
              <div className="flex gap-3 mt-4 justify-end">
                <button onClick={() => handleEdit(p)} className="flex items-center bg-yellow-500 px-3 py-1.5 rounded-lg text-white hover:bg-yellow-600 transition-all text-sm shadow-md">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(p.cinPraticien)} className="flex items-center bg-red-600 px-3 py-1.5 rounded-lg text-white hover:bg-red-700 transition-all text-sm shadow-md">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-5 text-gray-500 bg-white rounded-xl shadow-lg border border-sky-200">
            <X className="w-6 h-6 inline-block mr-2 text-red-400" /> Aucun praticien trouvé.
          </div>
        )}
      </div>

      {/* Animations CSS (maintenues) */}
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