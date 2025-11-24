import React, { useEffect, useState } from 'react';
import axios from 'axios';
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";
import { PlusCircle, Search, Edit2, Trash2, FileText, FileSpreadsheet, ChevronUp, ChevronDown, RefreshCw, X, Check, Clock } from 'lucide-react';

export default function Patients() {
  const [patients, setPatients] = useState([]);
  const [formData, setFormData] = useState({
    cinPatient: '',
    prenom: '',
    nom: '',
    age: '',
    adresse: '',
    email: '',
    sexe: 'Homme',
    telephone: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState({ nom: '', prenom: '', email: '', telephone: '' });
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
  const fetchPatients = () => {
    setLoading(true);
    axios.get('https://mon-api-rmv3.onrender.com/patients')
      .then(res => setPatients(res.data))
      .catch(() => handleError("Erreur lors du chargement des patients."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  // --- Form Handlers ---
  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const url = `https://mon-api-rmv3.onrender.com/patients${isEditing ? '/' + formData.cinPatient : ''}`;
    const method = isEditing ? 'put' : 'post';
    
    // Validation simple de l'âge
    if (formData.age && (isNaN(formData.age) || formData.age < 0 || formData.age > 120)) {
        handleError("L'âge doit être un nombre valide entre 0 et 120.");
        return;
    }

    axios[method](url, formData)
      .then(() => {
        fetchPatients();
        setFormData({ cinPatient: '', prenom: '', nom: '', age: '', adresse: '', email: '', sexe: 'Homme', telephone: '' });
        setIsEditing(false);
        setShowForm(false);
        handleSuccess(isEditing ? "Dossier patient modifié avec succès." : "Nouveau patient ajouté avec succès.");
      })
      .catch(() => handleError(`Erreur lors de l'enregistrement du patient. Vérifiez le CIN unique.`));
  };

  const handleEdit = (patient) => {
    if (window.confirm("⚠️ Confirmer la modification du dossier patient ?")) {
      setFormData(patient);
      setIsEditing(true);
      setShowForm(true);
    }
  };

  const handleAdd = () => {
    setFormData({ cinPatient: '', prenom: '', nom: '', age: '', adresse: '', email: '', sexe: 'Homme', telephone: '' });
    setIsEditing(false);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setIsEditing(false);
    setFormData({ cinPatient: '', prenom: '', nom: '', age: '', adresse: '', email: '', sexe: 'Homme', telephone: '' });
  };

  const handleDelete = (cin) => {
    if (window.confirm("⚠️ ATTENTION : La suppression est définitive. Voulez-vous vraiment continuer ?")) {
      axios.delete(`https://mon-api-rmv3.onrender.com/patients/${cin}`)
        .then(() => {
          fetchPatients();
          handleSuccess("Patient supprimé avec succès.");
        })
        .catch(() => handleError("Erreur lors de la suppression du patient."));
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

  const filteredPatients = patients
    .filter(p =>
      p.nom.toLowerCase().includes(search.nom.toLowerCase()) &&
      p.prenom.toLowerCase().includes(search.prenom.toLowerCase()) &&
      p.email.toLowerCase().includes(search.email.toLowerCase()) &&
      p.telephone.toLowerCase().includes(search.telephone.toLowerCase())
    )
    .sort((a, b) => {
      const aVal = a[sortField] || '';
      const bVal = b[sortField] || '';
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      // Pour les nombres comme l'âge
      const aNum = Number(aVal) || 0;
      const bNum = Number(bVal) || 0;

      return sortOrder === 'asc'
        ? aNum - bNum
        : bNum - aNum;
    });

  const totalPages = Math.ceil(filteredPatients.length / perPage);
  const paginatedPatients = filteredPatients.slice((page - 1) * perPage, page * perPage);

  // --- Export Functions ---
  const handlePrintPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.setTextColor(33, 150, 243); // Bleu
    doc.text("Liste des Patients", 14, 15);
    doc.autoTable({
      head: [[
        "CIN", "Nom", "Prénom", "Sexe", "Âge", "Adresse", "Email", "Téléphone"
      ]],
      body: filteredPatients.map(p => [
        p.cinPatient, p.nom, p.prenom, p.sexe, p.age, p.adresse, p.email, p.telephone
      ]),
      startY: 25,
      styles: { fontSize: 9, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [66, 165, 245], textColor: [255, 255, 255] }, // Bleu clair pour l'en-tête
      alternateRowStyles: { fillColor: [245, 245, 245] }
    });
    doc.save("liste_patients.pdf");
    handleSuccess("Fichier PDF généré avec succès.");
  };

  const handleExportExcel = () => {
    const dataToExport = filteredPatients.map(({ cinPatient, nom, prenom, sexe, age, adresse, email, telephone }) => ({
        CIN: cinPatient,
        Nom: nom,
        Prénom: prenom,
        Sexe: sexe,
        Âge: age,
        Adresse: adresse,
        Email: email,
        Téléphone: telephone
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Patients");
    XLSX.writeFile(wb, "liste_patients.xlsx");
    handleSuccess("Fichier Excel généré avec succès.");
  };
  
  // Icone de tri pour les colonnes
  const SortIcon = ({ field }) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' 
      ? <ChevronUp className="w-4 h-4 inline-block ml-1" /> 
      : <ChevronDown className="w-4 h-4 inline-block ml-1" />;
  };


  // Classes de styles Tailwind CSS pour les boutons d'action
  const actionButtonClasses = "flex items-center justify-center p-2 rounded-full shadow-md transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2";


  return (
    <div className="p-4 bg-gray-50 min-h-screen max-w-[1800px] mx-auto">
      
      {/* Notifications */}
      {notification.show && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-xl shadow-2xl font-semibold text-white flex items-center gap-2 transform transition-all duration-300 ease-in-out ${notification.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {notification.type === 'success' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
          {notification.message}
        </div>
      )}

      {/* Titre */}
      <h2 className="text-3xl font-extrabold mb-8 text-sky-700 text-center border-b-2 border-sky-200 pb-3">
        Dossiers des Patients 🧑‍⚕️
      </h2>

      {/* Zone de Recherche et Actions */}
      <div className="bg-white p-6 rounded-2xl shadow-xl mb-6 border border-sky-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-4">
          <p className='text-gray-600 font-semibold flex items-center gap-2'>
            <Search className="w-5 h-5 text-sky-500" /> Rechercher un patient:
          </p>
          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <input
              type="text"
              placeholder="Nom"
              className="w-full sm:w-36 px-4 py-2 rounded-xl border border-gray-300 text-gray-800 focus:ring-2 focus:ring-sky-300 transition-all shadow-sm outline-none"
              value={search.nom}
              name="nom"
              onChange={handleSearchChange}
            />
            <input
              type="text"
              placeholder="Prénom"
              className="w-full sm:w-36 px-4 py-2 rounded-xl border border-gray-300 text-gray-800 focus:ring-2 focus:ring-sky-300 transition-all shadow-sm outline-none"
              value={search.prenom}
              name="prenom"
              onChange={handleSearchChange}
            />
            <input
              type="text"
              placeholder="Email"
              className="w-full sm:w-36 px-4 py-2 rounded-xl border border-gray-300 text-gray-800 focus:ring-2 focus:ring-sky-300 transition-all shadow-sm outline-none"
              value={search.email}
              name="email"
              onChange={handleSearchChange}
            />
            <input
              type="text"
              placeholder="Téléphone"
              className="w-full sm:w-36 px-4 py-2 rounded-xl border border-gray-300 text-gray-800 focus:ring-2 focus:ring-sky-300 transition-all shadow-sm outline-none"
              value={search.telephone}
              name="telephone"
              onChange={handleSearchChange}
            />
          </div>
        </div>
        
        <div className="flex gap-3 mt-4 justify-end">
            <button
              onClick={handleAdd}
              className={`${actionButtonClasses} bg-emerald-500 text-white hover:bg-emerald-600 focus:ring-emerald-500`}
              title="Ajouter un nouveau patient"
            >
              <PlusCircle className="w-5 h-5 mr-2" /> Ajouter
            </button>
            <button
              onClick={handlePrintPDF}
              className={`${actionButtonClasses} bg-red-500 text-white hover:bg-red-600 focus:ring-red-500`}
              title="Exporter en PDF"
            >
              <FileText className="w-5 h-5 mr-2" /> PDF
            </button>
            <button
              onClick={handleExportExcel}
              className={`${actionButtonClasses} bg-green-500 text-white hover:bg-green-600 focus:ring-green-500`}
              title="Exporter en Excel"
            >
              <FileSpreadsheet className="w-5 h-5 mr-2" /> Excel
            </button>
             <button
              onClick={fetchPatients}
              className={`${actionButtonClasses} bg-sky-500 text-white hover:bg-sky-600 focus:ring-sky-500`}
              title="Rafraîchir les données"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
        </div>
      </div>

      {/* Formulaire d'Ajout/Modification */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-xl mb-8 space-y-6 border border-sky-200">
          <h3 className="text-2xl font-bold text-sky-700">{isEditing ? 'Modifier le Dossier Patient' : 'Ajouter un Nouveau Patient'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">CIN*</label>
                <input className="border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-sky-400 focus:border-sky-400 transition" name="cinPatient" placeholder="CIN" value={formData.cinPatient} onChange={handleChange} required disabled={isEditing} />
            </div>

            <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">Prénom*</label>
                <input className="border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-sky-400 focus:border-sky-400 transition" name="prenom" placeholder="Prénom" value={formData.prenom} onChange={handleChange} required />
            </div>
            
            <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">Nom*</label>
                <input className="border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-sky-400 focus:border-sky-400 transition" name="nom" placeholder="Nom" value={formData.nom} onChange={handleChange} required />
            </div>
            
            <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">Âge*</label>
                <input className="border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-sky-400 focus:border-sky-400 transition" name="age" type="number" placeholder="Âge" value={formData.age} onChange={handleChange} required min="0" max="120" />
            </div>

            <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">Adresse</label>
                <input className="border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-sky-400 focus:border-sky-400 transition" name="adresse" placeholder="Adresse complète" value={formData.adresse} onChange={handleChange} />
            </div>
            
            <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">Email</label>
                <input className="border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-sky-400 focus:border-sky-400 transition" name="email" type="email" placeholder="Email" value={formData.email} onChange={handleChange} />
            </div>
            
            <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">Sexe*</label>
                <select className="border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-sky-400 focus:border-sky-400 transition" name="sexe" value={formData.sexe} onChange={handleChange} required>
                    <option value="Homme">Homme</option>
                    <option value="Femme">Femme</option>
                </select>
            </div>
            
            <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-1">Téléphone</label>
                <input className="border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-sky-400 focus:border-sky-400 transition" name="telephone" placeholder="Téléphone" value={formData.telephone} onChange={handleChange} />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-4">
            <button type="submit" className="flex items-center bg-sky-600 text-white font-semibold px-6 py-2 rounded-xl hover:bg-sky-700 transition-all shadow-md">
                {isEditing ? <Edit2 className="w-5 h-5 mr-2" /> : <PlusCircle className="w-5 h-5 mr-2" />}
                {isEditing ? 'Mettre à jour' : 'Enregistrer'}
            </button>
            <button type="button" onClick={handleCancel} className="flex items-center bg-gray-400 text-white font-semibold px-6 py-2 rounded-xl hover:bg-gray-500 transition-all shadow-md">
                <X className="w-5 h-5 mr-2" /> Annuler
            </button>
          </div>
        </form>
      )}

      {/* Tableau des Patients (Écran Large) */}
      <div className="mt-8 hidden md:block">
        <div className="overflow-x-auto bg-white rounded-2xl shadow-xl border border-sky-100">
          <table className="min-w-[1400px] w-full text-sm">
            <thead>
              <tr className="bg-sky-50 text-sky-800 uppercase text-left font-semibold border-b border-sky-200">
                {/* En-têtes cliquables pour le tri */}
                {['cinPatient', 'nom', 'prenom', 'sexe', 'age'].map(field => (
                  <th key={field} className="px-4 py-3 cursor-pointer hover:bg-sky-100 transition-all" onClick={() => handleSort(field)}>
                    {field === 'cinPatient' ? 'CIN' : field.charAt(0).toUpperCase() + field.slice(1)} <SortIcon field={field} />
                  </th>
                ))}
                <th className="px-4 py-3">Adresse</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Téléphone</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-6 text-sky-500 font-semibold flex items-center justify-center gap-2">
                    <Clock className="w-5 h-5 animate-spin" /> Chargement des données...
                  </td>
                </tr>
              ) : paginatedPatients.length > 0 ? (
                paginatedPatients.map((p, index) => (
                  <tr key={p.cinPatient} className={`border-t border-gray-100 hover:bg-sky-50/50 transition-all duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-4 py-2">{p.cinPatient}</td>
                    <td className="px-4 py-2 font-medium">{p.nom}</td>
                    <td className="px-4 py-2">{p.prenom}</td>
                    <td className="px-4 py-2">{p.sexe}</td>
                    <td className="px-4 py-2">{p.age}</td>
                    <td className="px-4 py-2 max-w-[200px] truncate" title={p.adresse}>{p.adresse}</td>
                    <td className="px-4 py-2 max-w-[150px] truncate" title={p.email}>{p.email}</td>
                    <td className="px-4 py-2">{p.telephone}</td>
                    <td className="px-4 py-2 space-x-2 flex justify-center">
                      <button onClick={() => handleEdit(p)} className="flex items-center bg-yellow-500 text-white px-3 py-1 rounded-lg hover:bg-yellow-600 transition-all text-xs shadow-sm">
                        <Edit2 className="w-4 h-4 mr-1" /> Modifier
                      </button>
                      <button onClick={() => handleDelete(p.cinPatient)} className="flex items-center bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 transition-all text-xs shadow-sm">
                        <Trash2 className="w-4 h-4 mr-1" /> Supprimer
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="text-center py-6 text-gray-500">
                    <X className="w-5 h-5 inline-block mr-2 text-red-400" /> Aucun patient ne correspond aux critères de recherche.
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

      {/* Cartes Patients (Écran Mobile) */}
      <div className="md:hidden grid grid-cols-1 gap-4 mt-6">
        {loading ? (
          <div className="text-center text-sky-500 font-semibold">Chargement des dossiers...</div>
        ) : paginatedPatients.length > 0 ? (
          paginatedPatients.map((p) => (
            <div key={p.cinPatient} className="bg-white p-5 rounded-xl shadow-lg border border-sky-200 hover:shadow-xl transition-all duration-200">
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-sky-100">
                <span className="font-extrabold text-lg text-sky-700">{p.nom} {p.prenom}</span>
                <span className="bg-sky-100 text-sky-700 px-3 py-1 rounded-full text-xs font-semibold border border-sky-300">{p.sexe}, {p.age} ans</span>
              </div>
              <div className="text-gray-600 space-y-1">
                <p><strong>CIN:</strong> <span className="font-medium text-gray-800">{p.cinPatient}</span></p>
                <p><strong>Email:</strong> {p.email}</p>
                <p><strong>Téléphone:</strong> {p.telephone}</p>
                <p><strong>Adresse:</strong> {p.adresse}</p>
              </div>
              <div className="flex gap-3 mt-4 justify-end">
                <button onClick={() => handleEdit(p)} className="flex items-center bg-yellow-500 text-white px-3 py-1.5 rounded-lg hover:bg-yellow-600 transition-all text-sm shadow-md">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(p.cinPatient)} className="flex items-center bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition-all text-sm shadow-md">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-5 text-gray-500 bg-white rounded-xl shadow-lg border border-sky-200">
            <X className="w-6 h-6 inline-block mr-2 text-red-400" /> Aucun patient trouvé.
          </div>
        )}
      </div>
    </div>
  );
}