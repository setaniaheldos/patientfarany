import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
  UserIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  XMarkIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  AcademicCapIcon, // Pour le Praticien
  PrinterIcon, // Pour le PDF
  UserGroupIcon // Pour le Patient
} from "@heroicons/react/24/outline";

// Constante pour la pagination
const PAGE_SIZE = 8;
const API_BASE_URL = 'http://localhost:3001'; // Constante pour l'URL de base

export default function Consultations() {
  // --- États des données ---
  const [consultations, setConsultations] = useState([]);
  const [rendezvous, setRendezvous] = useState([]);
  const [patients, setPatients] = useState([]);
  const [praticiens, setPraticiens] = useState([]);

  // --- États du formulaire et de l'interface ---
  const [form, setForm] = useState({
    idRdv: '',
    dateConsult: '',
    compteRendu: '',
    prix: ''
  });
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false); // Par défaut masqué
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const [loading, setLoading] = useState(false);
  const [pdfDate, setPdfDate] = useState(''); // Nouvel état pour la date d'impression PDF

  // --- États de la recherche / filtre ---
  const [search, setSearch] = useState({
    patient: '',
    praticien: '',
    date: '',
    compteRendu: ''
  });

  // --- États de la pagination ---
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(consultations.length / PAGE_SIZE);
  const paginated = consultations.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // --- UTILS ---

  // Notification
  const showNotification = (msg, type = 'success') => {
    setNotification({ show: true, message: msg, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3500);
  };

  // Utilitaires de données (Optimisation avec useMemo)
  const patientMap = useMemo(() => 
    new Map(patients.map(p => [p.cinPatient, p])), 
    [patients]
  );
  const praticienMap = useMemo(() => 
    new Map(praticiens.map(p => [p.cinPraticien, p])), 
    [praticiens]
  );
  const rdvMap = useMemo(() => 
    new Map(rendezvous.map(r => [r.idRdv, r])), 
    [rendezvous]
  );

  const getPatientName = (cin) => {
    const p = patientMap.get(cin);
    return p ? `${p.nom.toUpperCase()} ${p.prenom}` : 'Patient inconnu';
  };

  const getPraticienName = (cin) => {
    const pr = praticienMap.get(cin);
    return pr ? `Dr. ${pr.nom.toUpperCase()} ${pr.prenom}` : 'Praticien inconnu';
  };

  const getRdvDetails = (idRdv) => rdvMap.get(idRdv);

  // Formatage de la date pour l'affichage
  const formatDateTime = (dateString) => {
    if (!dateString) return '—';
    try {
        return new Date(dateString).toLocaleString('fr-FR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return dateString.substring(0, 19).replace('T', ' ');
    }
  };

  // --- CHARGEMENT DES DONNÉES ---
  const fetchAll = async () => {
    setLoading(true);
    try {
      // Charger les données de toutes les tables normalisées en parallèle
      const [consultRes, rdvRes, patRes, pratRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/consultations`),
        axios.get(`${API_BASE_URL}/rendezvous`),
        axios.get(`${API_BASE_URL}/patients`),
        axios.get(`${API_BASE_URL}/praticiens`)
      ]);

      setConsultations(consultRes.data || []);
      setRendezvous(rdvRes.data || []);
      setPatients(patRes.data || []);
      setPraticiens(pratRes.data || []);
      setPage(1);
    } catch (err) {
      console.error("Erreur fetchAll:", err);
      showNotification('Impossible de charger les données. Vérifiez le serveur.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // --- RECHERCHE ET FILTRE ---

  const handleSearch = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.patient) params.append('patient', search.patient);
      if (search.praticien) params.append('praticien', search.praticien);
      if (search.date) params.append('date', search.date);
      if (search.compteRendu) params.append('compteRendu', search.compteRendu); 

      const url = params.toString()
        ? `${API_BASE_URL}/consultations/search?${params.toString()}`
        : `${API_BASE_URL}/consultations`;

      const res = await axios.get(url);
      setConsultations(res.data || []);
      setPage(1);
    } catch (err) {
      console.error(err);
      showNotification('Erreur lors de la recherche. Vérifiez les paramètres du filtre.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // --- GESTION PDF ---
  const handlePrintPdf = () => {
    if (!pdfDate) {
      showNotification('Veuillez sélectionner une date pour l\'impression PDF.', 'error');
      return;
    }
    
    // Filtre les consultations pour la date sélectionnée
    const dateToFilter = new Date(pdfDate).toISOString().split('T')[0];
    const consultationsForPdf = consultations.filter(c => 
        c.dateConsult.startsWith(dateToFilter)
    );

    if (consultationsForPdf.length === 0) {
        showNotification(`Aucune consultation trouvée pour la date ${pdfDate}.`, 'error');
        return;
    }
    
    const count = consultationsForPdf.length;
    // Simulation de l'impression
    showNotification(`Génération d'un rapport PDF pour ${count} consultation(s) du ${pdfDate}... (Simulation)`, 'success');
    console.log(`Données pour le PDF du ${pdfDate}:`, consultationsForPdf);
  };


  // --- CRUD (Create, Read, Update, Delete) ---

  const resetForm = () => {
    setForm({ idRdv: '', dateConsult: '', compteRendu: '', prix: '' });
    setEditingId(null);
  };

  // Enregistrement / Modification
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.idRdv || !form.dateConsult || !form.compteRendu.trim()) {
      showNotification('Veuillez remplir tous les champs obligatoires.', 'error');
      return;
    }

    const dateTimeValue = form.dateConsult.length === 16 
      ? `${form.dateConsult}:00` 
      : form.dateConsult;

    const payload = {
      idRdv: parseInt(form.idRdv),
      dateConsult: dateTimeValue,
      compteRendu: form.compteRendu.trim(),
      prix: form.prix ? parseFloat(form.prix) : null
    };

    try {
      if (editingId) {
        await axios.put(`${API_BASE_URL}/consultations/${editingId}`, payload);
        showNotification('Consultation modifiée avec succès !');
      } else {
        await axios.post(`${API_BASE_URL}/consultations`, payload);
        showNotification('Consultation enregistrée avec succès !');
      }
      resetForm();
      fetchAll();
      setShowForm(false);
    } catch (err) {
      console.error("Erreur enregistrement:", err.response?.data || err);
      showNotification(err.response?.data?.error || 'Erreur serveur lors de l\'opération.', 'error');
    }
  };

  const handleEdit = (consult) => {
    const dateStr = consult.dateConsult || '';
    setForm({
      idRdv: consult.idRdv,
      dateConsult: dateStr.replace(' ', 'T').substring(0, 16),
      compteRendu: consult.compteRendu || '',
      prix: consult.prix || ''
    });
    setEditingId(consult.idConsult);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer définitivement cette consultation ? Cette action est irréversible.')) return;
    try {
      await axios.delete(`${API_BASE_URL}/consultations/${id}`);
      showNotification('Consultation supprimée avec succès.');
      fetchAll();
    } catch (err) {
      console.error("Erreur suppression:", err);
      showNotification('Erreur lors de la suppression.', 'error');
    }
  };

  // --- RENDU DU COMPOSANT ---

  return (
    <>
      {/* Notification Toast */}
      {notification.show && (
        <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-xl shadow-2xl text-white font-medium flex items-center gap-3 ${
          notification.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
        } transition-all duration-300 transform animate-fade-in`}>
          {notification.type === 'success' ? '✓' : '✕'} {notification.message}
        </div>
      )}

      <div className="min-h-screen bg-gray-50 p-6 md:p-10">
        <div className="max-w-7xl mx-auto">

          {/* Titre et Design Médical */}
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-green-600">
              Dossiers & Consultations Médicales
            </h1>
            <p className="text-gray-500 mt-2 font-light">Gestion des diagnostics, comptes rendus et factures</p>
          </div>

          {/* Contrôle d'Impression PDF */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-red-100 flex flex-col md:flex-row justify-between items-center gap-4">
              <h2 className="text-xl font-semibold text-red-800 flex items-center gap-2">
                  <PrinterIcon className="h-6 w-6" /> Impression de Rapport PDF par Date
              </h2>
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <input
                      type="date"
                      value={pdfDate}
                      onChange={(e) => setPdfDate(e.target.value)}
                      className="w-full sm:w-44 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
                  />
                  <button 
                      onClick={handlePrintPdf} 
                      className="w-full sm:w-auto px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition flex items-center justify-center gap-2 font-medium shadow-md"
                  >
                      Générer PDF
                  </button>
              </div>
          </div>


          {/* Barre de recherche (Filtres) */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-blue-100">
            <h2 className="text-xl font-semibold text-blue-800 mb-4 flex items-center gap-2">
                <MagnifyingGlassIcon className="h-6 w-6" /> Filtres de Recherche
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
              <input
                type="text"
                placeholder="Nom Patient..."
                value={search.patient}
                onChange={(e) => setSearch({ ...search, patient: e.target.value })}
                className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <input
                type="text"
                placeholder="Nom Praticien..."
                value={search.praticien}
                onChange={(e) => setSearch({ ...search, praticien: e.target.value })}
                className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <input
                type="date"
                value={search.date}
                onChange={(e) => setSearch({ ...search, date: e.target.value })}
                className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <input
                type="text"
                placeholder="Mot-clé Compte Rendu..."
                value={search.compteRendu}
                onChange={(e) => setSearch({ ...search, compteRendu: e.target.value })}
                className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <div className="flex gap-3 justify-end lg:col-span-1 sm:col-span-2">
                <button 
                    onClick={handleSearch} 
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-2 font-medium"
                >
                  <MagnifyingGlassIcon className="h-5 w-5" /> Chercher
                </button>
                <button 
                    onClick={() => { setSearch({ patient: '', praticien: '', date: '', compteRendu: '' }); fetchAll(); }} 
                    className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition font-medium"
                >
                  Effacer
                </button>
              </div>
            </div>
          </div>

          {/* Bouton Cacher / Afficher Formulaire */}
          <div className="flex justify-end mb-6">
            <button 
                onClick={() => { setShowForm(!showForm); resetForm(); }}
                className={`px-6 py-3 rounded-xl transition flex items-center gap-2 font-medium shadow-md ${showForm ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`}
            >
                {showForm ? (
                    <>
                        <ChevronUpIcon className="h-5 w-5" /> Cacher le formulaire
                    </>
                ) : (
                    <>
                        <PlusIcon className="h-5 w-5" /> Nouvelle consultation
                    </>
                )}
            </button>
          </div>

          {/* Formulaire (Conditionnel) */}
          <div className={`bg-white rounded-2xl shadow-2xl p-8 mb-10 border border-blue-100 transition-all duration-500 overflow-hidden ${showForm ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0 p-0 mb-0'}`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-blue-700 flex items-center gap-3">
                {editingId ? <PencilSquareIcon className="h-8 w-8" /> : <PlusIcon className="h-8 w-8" />}
                {editingId ? `Modification: Consultation #${editingId}` : 'Enregistrer une nouvelle consultation'}
              </h2>
              {editingId && (
                <button onClick={() => {resetForm(); setShowForm(false);}} className="text-red-500 hover:text-red-700 transition">
                  <XMarkIcon className="h-8 w-8" />
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Rendez-vous (Select) */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <UserGroupIcon className="inline h-5 w-5 mr-1 text-blue-500" /> Rendez-vous lié *
                </label>
                <select
                  value={form.idRdv}
                  onChange={(e) => setForm({ ...form, idRdv: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                  <option value="">Sélectionner un Rdv (obligatoire)</option>
                  {rendezvous.map(rdv => (
                    <option key={rdv.idRdv} value={rdv.idRdv}>
                      Rdv #{rdv.idRdv} : {getPatientName(rdv.cinPatient)} / {getPraticienName(rdv.cinPraticien)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Heure (DateTime-Local) */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <CalendarIcon className="inline h-5 w-5 mr-1 text-blue-500" /> Date et heure *
                </label>
                <input
                  type="datetime-local"
                  value={form.dateConsult}
                  onChange={(e) => setForm({ ...form, dateConsult: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                />
              </div>

              {/* Prix (Number) */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <CurrencyDollarIcon className="inline h-5 w-5 mr-1 text-green-500" /> Prix (DA)
                </label>
                <input
                  type="number"
                  step="100"
                  placeholder="Ex: 5000"
                  value={form.prix}
                  onChange={(e) => setForm({ ...form, prix: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              
              <div className="hidden lg:block"></div> 

              {/* Compte rendu (Textarea) */}
              <div className="md:col-span-2 lg:col-span-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <DocumentTextIcon className="inline h-5 w-5 mr-1 text-blue-500" /> Compte rendu médical *
                </label>
                <textarea
                  rows="4"
                  value={form.compteRendu}
                  onChange={(e) => setForm({ ...form, compteRendu: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  placeholder="Diagnostic, détails de l'examen, traitements prescrits..."
                />
              </div>

              {/* Boutons */}
              <div className="lg:col-span-4 flex justify-end gap-4 mt-4">
                <button type="button" onClick={resetForm} className="px-8 py-3 bg-gray-300 text-gray-700 rounded-xl hover:bg-gray-400 transition font-medium">
                  Effacer les champs
                </button>
                <button type="submit" className="px-8 py-3 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-xl hover:shadow-xl transform hover:scale-[1.02] transition font-medium shadow-lg">
                  {editingId ? 'Mettre à jour la consultation' : 'Enregistrer la consultation'}
                </button>
              </div>
            </form>
          </div>

          {/* Tableau Desktop */}
          <div className="hidden lg:block bg-white rounded-2xl shadow-xl overflow-hidden border border-blue-200">
            <table className="w-full">
              <thead className="bg-blue-600 text-white sticky top-0">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold">ID</th>
                  <th className="px-6 py-4 text-left font-semibold">Patient / Praticien</th> {/* Colonne combinée */}
                  <th className="px-6 py-4 text-left font-semibold">Date & Heure</th>
                  <th className="px-6 py-4 text-left font-semibold">Prix</th>
                  <th className="px-6 py-4 text-left font-semibold max-w-sm">Compte rendu</th>
                  <th className="px-6 py-4 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-16 text-blue-500 text-xl font-medium animate-pulse">
                    <DocumentTextIcon className="h-6 w-6 inline mr-2" /> Chargement des dossiers médicaux...
                  </td></tr>
                ) : paginated.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-16 text-gray-500 text-lg">
                    Aucune consultation trouvée.
                  </td></tr>
                ) : paginated.map(c => {
                  const rdv = getRdvDetails(c.idRdv);
                  return (
                    <tr key={c.idConsult} className="border-t border-gray-100 hover:bg-blue-50 transition">
                      <td className="px-6 py-4 font-bold text-blue-700">#{c.idConsult}</td>
                      <td className="px-6 py-4 text-gray-800">
                        <div className="flex items-center gap-2 mb-1">
                            <UserGroupIcon className="h-5 w-5 text-blue-400"/> 
                            <span className="font-bold">{rdv ? getPatientName(rdv.cinPatient) : '—'}</span>
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                            <AcademicCapIcon className="h-4 w-4 text-green-400"/> 
                            <span>{rdv ? getPraticienName(rdv.cinPraticien) : '—'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600 font-mono text-sm">{formatDateTime(c.dateConsult)}</td>
                      <td className="px-6 py-4 font-extrabold text-lg">
                        {c.prix ? (
                            <span className="text-green-600">{Number(c.prix).toLocaleString()} DA</span>
                        ) : (
                            <span className="text-gray-500">Gratuit</span>
                        )}
                      </td>
                      <td className="px-6 py-4 max-w-xs text-sm text-gray-700 truncate hover:whitespace-normal hover:overflow-visible transition-all duration-300">
                        {c.compteRendu || '—'}
                      </td>
                      <td className="px-6 py-4 text-center space-x-4">
                        <button onClick={() => handleEdit(c)} title="Modifier" className="text-blue-600 hover:text-blue-800 transition">
                          <PencilSquareIcon className="h-6 w-6" />
                        </button>
                        <button onClick={() => handleDelete(c.idConsult)} title="Supprimer" className="text-red-600 hover:text-red-800 transition">
                          <TrashIcon className="h-6 w-6" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Cartes Mobile */}
          <div className="lg:hidden grid gap-6 mt-8">
            {loading ? (
                <div className="text-center py-10 text-blue-500 text-xl font-medium animate-pulse">Chargement...</div>
            ) : paginated.length === 0 ? (
                <div className="text-center py-10 text-gray-500 text-lg">Aucune consultation trouvée.</div>
            ) : paginated.map(c => {
              const rdv = getRdvDetails(c.idRdv);
              return (
                <div key={c.idConsult} className="bg-white rounded-2xl shadow-lg p-6 border-l-8 border-blue-500">
                  <div className="flex justify-between items-center mb-4 border-b pb-3 border-gray-100">
                    <h3 className="text-2xl font-extrabold text-blue-700">Dossier #{c.idConsult}</h3>
                    <span className={`px-4 py-1 rounded-full text-sm font-bold shadow-sm ${c.prix ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
                      {c.prix ? `${Number(c.prix).toLocaleString()} DA` : 'Gratuit'}
                    </span>
                  </div>
                  <div className="space-y-3 text-gray-700 mt-4">
                    <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="flex items-center gap-2 text-sm text-gray-600 mb-1"><UserGroupIcon className="h-4 w-4 text-blue-500" /> **Patient :**</p> 
                        <span className="font-semibold text-base block ml-6">{rdv ? getPatientName(rdv.cinPatient) : '—'}</span>
                        <p className="flex items-center gap-2 text-sm text-gray-600 mt-2 mb-1"><AcademicCapIcon className="h-4 w-4 text-green-500" /> **Praticien :**</p> 
                        <span className="font-semibold text-base block ml-6">{rdv ? getPraticienName(rdv.cinPraticien) : '—'}</span>
                    </div>
                    <p className="flex items-center gap-2"><CalendarIcon className="h-5 w-5 text-gray-500" /> <strong>Date :</strong> {formatDateTime(c.dateConsult)}</p>
                    <div className="pt-3 border-t mt-3 border-gray-100">
                        <p className="text-sm font-semibold text-gray-600 mb-1">Compte rendu :</p>
                        <p className="text-base italic text-gray-800">{c.compteRendu || '—'}</p>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-6 border-t pt-4">
                    <button onClick={() => handleEdit(c)} className="flex-1 bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition font-medium shadow-md">
                      <PencilSquareIcon className="h-5 w-5 inline mr-1" /> Modifier
                    </button>
                    <button onClick={() => handleDelete(c.idConsult)} className="flex-1 bg-red-600 text-white py-3 rounded-xl hover:bg-red-700 transition font-medium shadow-md">
                      <TrashIcon className="h-5 w-5 inline mr-1" /> Supprimer
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-6 mt-12">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-6 py-3 bg-blue-100 text-blue-700 rounded-xl disabled:opacity-50 hover:bg-blue-200 transition font-medium flex items-center gap-2"
              >
                <ChevronDownIcon className="h-5 w-5 rotate-90"/> Précédent
              </button>
              <span className="text-xl font-bold text-gray-700">Page {page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-6 py-3 bg-blue-100 text-blue-700 rounded-xl disabled:opacity-50 hover:bg-blue-200 transition font-medium flex items-center gap-2"
              >
                Suivant <ChevronUpIcon className="h-5 w-5 rotate-90"/>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
