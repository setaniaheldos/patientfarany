import React, { useState, useEffect, useCallback, useMemo } from 'react';

// --- Dépendances externes (Simulées / Globals) ---
// Note: Dans cet environnement de fichier unique, nous supposons que la librairie SheetJS (XLSX) 
// est chargée globalement via un script CDN dans le HTML parent pour que l'objet 'XLSX' soit disponible.
// <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.17.0/xlsx.full.min.js"></script>

const API_BASE_URL = 'https://mon-api-rmv3.onrender.com';

// --- Composant Toast Personnalisé et Hook ---
const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    const newToast = { id, message, type };
    
    setToasts(prev => [...prev, newToast]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  const ToastContainer = () => (
    <div id="toast-container" className="fixed top-5 right-5 z-[1000] space-y-3">
      {toasts.map(toast => (
        <div 
          key={toast.id} 
          className={`min-w-[300px] p-4 rounded-xl shadow-lg text-white transition-all duration-300 ease-out 
            ${toast.type === 'success' ? 'bg-emerald-600' : 
              toast.type === 'error' ? 'bg-red-600' : 
              'bg-teal-600'}
            opacity-100 translate-x-0`}
          style={{ opacity: 1, transform: 'translateX(0)' }}
        >
          <div className="flex items-center space-x-2">
            {/* Icône basée sur le type */}
            {toast.type === 'success' && (
                <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            )}
            {toast.type === 'error' && (
                <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            )}
            {toast.type === 'info' && (
                <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            )}
            <span className="font-semibold">{toast.message}</span>
          </div>
        </div>
      ))}
    </div>
  );

  return { showToast, ToastContainer };
};

// --- Fonctions API de Récupération de Données ---

const fetchData = async (endpoint) => {
  try {
    const response = await fetch(`${API_BASE_URL}/${endpoint}`);
    if (!response.ok) throw new Error(`Erreur HTTP! Statut: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error(`Erreur lors du chargement de ${endpoint}:`, error);
    return [];
  }
};

// --- Composant Principal de l'Application ---

const App = () => {
  const { showToast, ToastContainer } = useToast();
  
  // États des données
  const [prescriptions, setPrescriptions] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [rendezvous, setRendezvous] = useState([]);
  const [patients, setPatients] = useState([]);
  const [praticiens, setPraticiens] = useState([]);
  const [loading, setLoading] = useState(true);

  // États UI
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingPrescription, setEditingPrescription] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteIdToConfirm, setDeleteIdToConfirm] = useState(null);
  
  // États de Filtrage/Tri/Pagination
  const [search, setSearch] = useState({ type: '', posologie: '' });
  const [sort, setSort] = useState({ key: 'idPrescrire', asc: true });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  // --- Mappage des Données pour les Joindre ---
  const { patientMap, praticienMap, rdvMap, consultMap } = useMemo(() => {
    return {
      patientMap: new Map(patients.map(p => [p.cinPatient, p])),
      praticienMap: new Map(praticiens.map(p => [p.cinPraticien, p])),
      rdvMap: new Map(rendezvous.map(r => [r.idRdv, r])),
      consultMap: new Map(consultations.map(c => [c.idConsult, c])),
    };
  }, [patients, praticiens, rendezvous, consultations]);

  // --- Fonctions d'Aide à l'Affichage ---

  const formatDateTime = (dateString) => {
    if (!dateString) return '—';
    return dateString.slice(0, 10);
  };

  const getNames = useCallback((idConsult) => {
    const consult = consultMap.get(idConsult);
    if (!consult) return { patient: 'Inconnu', praticien: 'Inconnu', rdv: null, dateConsult: 'N/A' };
    
    const rdv = rdvMap.get(consult.idRdv);
    if (!rdv) return { patient: 'Inconnu', praticien: 'Inconnu', rdv: null, dateConsult: formatDateTime(consult.dateConsult) };

    const patient = patientMap.get(rdv.cinPatient);
    const praticien = praticienMap.get(rdv.cinPraticien);

    return {
        patient: patient ? `${patient.nom.toUpperCase()} ${patient.prenom}` : 'Patient inconnu',
        praticien: praticien ? `Dr. ${praticien.nom.toUpperCase()} ${praticien.prenom}` : 'Praticien inconnu',
        rdv,
        dateConsult: formatDateTime(consult.dateConsult),
        compteRendu: consult.compteRendu
    };
  }, [consultMap, rdvMap, patientMap, praticienMap]);

  // --- Chargement Initial des Données ---

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    const [
      prescriptionsData, 
      consultationsData, 
      rendezvousData, 
      patientsData, 
      praticiensData
    ] = await Promise.all([
      fetchData('prescriptions'),
      fetchData('consultations'),
      fetchData('rendezvous'),
      fetchData('patients'),
      fetchData('praticiens')
    ]);

    setPrescriptions(prescriptionsData);
    setConsultations(consultationsData);
    setRendezvous(rendezvousData);
    setPatients(patientsData);
    setPraticiens(praticiensData);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // --- Logique de Filtrage, Tri et Pagination ---

  const filteredAndSortedPrescriptions = useMemo(() => {
    let filtered = prescriptions.filter(presc =>
      presc.typePrescrire.toLowerCase().includes(search.type.toLowerCase()) &&
      presc.posologie.toLowerCase().includes(search.posologie.toLowerCase())
    );

    if (sort.key) {
        filtered.sort((a, b) => {
            let valueA = a[sort.key];
            let valueB = b[sort.key];

            // Tri sur les données jointes
            if (['patient', 'praticien', 'dateConsult'].includes(sort.key)) {
                valueA = getNames(a.idConsult)[sort.key];
                valueB = getNames(b.idConsult)[sort.key];
            }

            // Normaliser les dates pour la comparaison
            if (sort.key === 'datePrescrire') {
                valueA = new Date(valueA);
                valueB = new Date(valueB);
            }

            if (valueA < valueB) return sort.asc ? -1 : 1;
            if (valueA > valueB) return sort.asc ? 1 : -1;
            return 0;
        });
    }

    return filtered;
  }, [prescriptions, search, sort, getNames]);

  const paginatedPrescriptions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedPrescriptions.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedPrescriptions, currentPage, itemsPerPage]);
  
  const totalPages = Math.ceil(filteredAndSortedPrescriptions.length / itemsPerPage);


  // --- Gestion des Actions UI ---

  const handleSearch = (e) => {
    setSearch(prev => ({ ...prev, [e.target.id.replace('search-', '')]: e.target.value }));
    setCurrentPage(1);
  };

  const handleSort = (key) => {
    const isAsc = sort.key === key ? !sort.asc : true;
    setSort({ key, asc: isAsc });
    setCurrentPage(1);
  };

  const showForm = (presc = null) => {
    setEditingPrescription(presc);
    setIsFormVisible(true);
  };

  const handleCancel = () => {
    setEditingPrescription(null);
    setIsFormVisible(false);
  };

  const showDetailModal = (presc) => {
    setSelectedDetail({ ...presc, ...getNames(presc.idConsult) });
    setIsDetailModalOpen(true);
  };

  const confirmDelete = (id) => {
    setDeleteIdToConfirm(id);
    setIsDeleteModalOpen(true);
  };
  
  const closeModal = (modalSetter) => {
    modalSetter(false);
    if (modalSetter === setIsDeleteModalOpen) setDeleteIdToConfirm(null);
    if (modalSetter === setIsDetailModalOpen) setSelectedDetail(null);
  };


  // --- Opérations CRUD ---

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('#submit-btn');
    submitBtn.disabled = true;

    const payload = {
      idConsult: parseInt(form.idConsult.value),
      typePrescrire: form.typePrescrire.value,
      posologie: form.posologie.value,
      datePrescrire: form.datePrescrire.value,
    };

    if (new Date(payload.datePrescrire) > new Date()) {
      showToast("La date de prescription ne peut pas être dans le futur.", 'error');
      submitBtn.disabled = false;
      return;
    }

    try {
      let response;
      if (editingPrescription) {
        response = await fetch(`${API_BASE_URL}/prescriptions/${editingPrescription.idPrescrire}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error("Erreur lors de la modification.");
        showToast("Prescription modifiée !", 'info');
      } else {
        response = await fetch(`${API_BASE_URL}/prescriptions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error("Erreur lors de l'ajout.");
        showToast("Prescription ajoutée !", 'success');
      }
      
      handleCancel();
      await fetchAllData();
    } catch (error) {
      console.error("Erreur d'enregistrement:", error);
      showToast(error.message || "Erreur lors de l'enregistrement.", 'error');
    } finally {
      submitBtn.disabled = false;
    }
  };

  const handleDelete = async () => {
    closeModal(setIsDeleteModalOpen);
    const id = deleteIdToConfirm;
    if (!id) return;
    
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/prescriptions/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error("Erreur lors de la suppression.");
      showToast("Prescription supprimée !", 'error');
      await fetchAllData();
    } catch (error) {
      console.error("Erreur de suppression:", error);
      showToast("Erreur lors de la suppression.", 'error');
    } finally {
      setLoading(false);
      setDeleteIdToConfirm(null);
    }
  };

  // --- Export Excel ---

  const handleExportExcel = () => {
    // Vérification de la disponibilité de la librairie globale
    if (typeof window.XLSX === 'undefined') {
        showToast("La librairie d'export Excel n'est pas chargée. Veuillez la charger via CDN.", 'error');
        return;
    }

    const data = filteredAndSortedPrescriptions.map(presc => {
        const names = getNames(presc.idConsult);
        return {
            'ID': presc.idPrescrire,
            'Consultation ID': presc.idConsult,
            'Patient': names.patient,
            'Praticien': names.praticien,
            'Compte rendu': names.compteRendu || '',
            'Date consultation': names.dateConsult,
            'Type': presc.typePrescrire,
            'Posologie': presc.posologie,
            'Date prescription': presc.datePrescrire
        };
    });
    
    if (data.length === 0) {
        showToast("Aucune donnée à exporter.", 'info');
        return;
    }

    const worksheet = window.XLSX.utils.json_to_sheet(data);
    const workbook = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(workbook, worksheet, "Prescriptions");
    window.XLSX.writeFile(workbook, "prescriptions_medicales.xlsx");
    showToast("Export Excel réussi !", 'success');
  };

  // --- Composant de la Ligne du Tableau ---

  const TableRow = ({ presc }) => {
    const { patient, praticien } = getNames(presc.idConsult);

    return (
      <tr className="border-b border-gray-100 hover:bg-teal-50 transition-all duration-200 text-sm">
        <td className="p-4 font-semibold text-teal-800">{presc.idPrescrire}</td>
        <td className="p-4 text-gray-700">
            <div className="flex items-center gap-1">
                <svg className="w-4 h-4 text-emerald-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.25a.75.75 0 0 1 .184-.135L12 18l7.315 2.115a.75.75 0 0 1 .184.135A9 9 0 0 1 21.75 12V7.5a1.125 1.125 0 0 0-1.125-1.125H3.375A1.125 1.125 0 0 0 2.25 7.5v4.5a9 9 0 0 1 2.25 8.25Z" /></svg>
                {patient}
            </div>
        </td>
        <td className="p-4 text-gray-700">
            <div className="flex items-center gap-1">
                <svg className="w-4 h-4 text-teal-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.796 60.796 0 0 0-.414 4.04c1.113-1.67 2.499-2.28 4.613-2.671L12 17.25l3.535-3.536c2.114.391 3.499 1 4.613 2.671-.161-.634-.414-2.126-1.077-4.04a60.796 60.796 0 0 0-.414-4.04l.158.077c.365.176.732.268 1.102.268.995 0 1.944-.393 2.65-1.1s1.102-1.655 1.102-2.65a2.766 2.766 0 0 0-.792-1.954 2.766 2.766 0 0 0-1.954-.792c-1.01 0-1.968.4-2.684 1.116-.716.716-1.116 1.674-1.116 2.684 0 .37.092.737.268 1.102l.077.158a60.796 60.796 0 0 0-.414 4.04v.085c-.015.056-.03.111-.045.166" /></svg>
                {praticien}
            </div>
        </td>
        <td className="p-4">{presc.typePrescrire}</td>
        <td className="p-4">{presc.posologie}</td>
        <td className="p-4 text-gray-500">{presc.datePrescrire}</td>
        <td className="p-4 text-center">
            <button onClick={() => showDetailModal(presc)} className="px-3 py-2 rounded-full bg-teal-500 text-white font-bold hover:bg-teal-700 transition-all text-xs shadow-md">Détails</button>
        </td>
        <td className="p-4 flex gap-2 justify-center">
            <button onClick={() => showForm(presc)} className="p-2 rounded-full bg-yellow-500 text-white hover:bg-yellow-600 transition-all text-xs shadow-md">
                <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 18.07a4.625 4.625 0 0 1-1.897 1.113L6.9 21l1.5-4.502a4.625 4.625 0 0 1 1.113-1.897l12.42-12.42Z" /></svg>
            </button>
            <button onClick={() => confirmDelete(presc.idPrescrire)} className="p-2 rounded-full bg-red-600 text-white hover:bg-red-700 transition-all text-xs shadow-md">
                <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9l-.346 9m-4.788 0L9.2 9m-.06 3.957-2.13-2.126m-5.485 5.485L17.22 6.787a.75.75 0 0 0-1.06-1.06L5.45 16.793a.75.75 0 0 0 0 1.06Z" /></svg>
            </button>
        </td>
      </tr>
    );
  };
  
  // --- Composant Carte Mobile ---
  const MobileCard = ({ presc }) => {
    const { patient, praticien, dateConsult } = getNames(presc.idConsult);
    
    return (
        <div className="bg-white rounded-xl p-4 shadow-lg border-l-4 border-teal-500 flex flex-col gap-2 text-sm">
            <div className="flex justify-between items-center border-b pb-2 mb-2">
                <span className="font-extrabold text-teal-700 text-lg">Prescription #{presc.idPrescrire}</span>
                <span className="text-gray-500 text-xs">Consultation ID: {presc.idConsult}</span>
            </div>
            <p className="flex items-center gap-2"><svg className="w-4 h-4 text-emerald-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.25a.75.75 0 0 1 .184-.135L12 18l7.315 2.115a.75.75 0 0 1 .184.135A9 9 0 0 1 21.75 12V7.5a1.125 1.125 0 0 0-1.125-1.125H3.375A1.125 1.125 0 0 0 2.25 7.5v4.5a9 9 0 0 1 2.25 8.25Z" /></svg> <span className="font-bold">Patient :</span> {patient}</p>
            <p className="flex items-center gap-2"><svg className="w-4 h-4 text-teal-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.796 60.796 0 0 0-.414 4.04c1.113-1.67 2.499-2.28 4.613-2.671L12 17.25l3.535-3.536c2.114.391 3.499 1 4.613 2.671-.161-.634-.414-2.126-1.077-4.04a60.796 60.796 0 0 0-.414-4.04l.158.077c.365.176.732.268 1.102.268.995 0 1.944-.393 2.65-1.1s1.102-1.655 1.102-2.65a2.766 2.766 0 0 0-.792-1.954 2.766 2.766 0 0 0-1.954-.792c-1.01 0-1.968.4-2.684 1.116-.716.716-1.116 1.674-1.116 2.684 0 .37.092.737.268 1.102l.077.158a60.796 60.796 0 0 0-.414 4.04v.085c-.015.056-.03.111-.045.166" /></svg> <span className="font-bold">Praticien :</span> {praticien}</p>
            <p className="text-xs text-gray-500"><span className="font-bold">Date consultation :</span> {dateConsult}</p>
            <p><span className="font-bold">Type :</span> {presc.typePrescrire}</p>
            <p><span className="font-bold">Posologie :</span> {presc.posologie}</p>
            <p className="text-xs text-gray-500"><span className="font-bold">Date :</span> {presc.datePrescrire}</p>
            <div className="flex gap-2 justify-end mt-3 border-t pt-3">
                <button onClick={() => showDetailModal(presc)} className="px-3 py-1 rounded-full bg-teal-500 text-white font-bold hover:bg-teal-700 transition-all text-xs shadow-md">Détails</button>
                <button onClick={() => showForm(presc)} className="px-3 py-1 rounded-full bg-yellow-500 text-white font-bold hover:bg-yellow-600 transition-all text-xs shadow-md">Modifier</button>
                <button onClick={() => confirmDelete(presc.idPrescrire)} className="px-3 py-1 rounded-full bg-red-600 text-white font-bold hover:bg-red-700 transition-all text-xs shadow-md">Supprimer</button>
            </div>
        </div>
    );
  }

  // --- Rendu Principal ---

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <style>{`
        body { font-family: 'Inter', sans-serif; }
        .icon { display: inline-block; width: 1.25rem; height: 1.25rem; vertical-align: text-bottom; }
      `}</style>
      <ToastContainer />
      
      <div className="max-w-7xl mx-auto mt-6 p-4 md:p-8 bg-white rounded-2xl shadow-2xl border-t-8 border-teal-500">
        
        {/* En-tête et Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b pb-4 border-gray-100">
            <h2 className="text-3xl font-extrabold text-teal-700 flex items-center gap-3 mb-4 sm:mb-0">
                <svg className="icon w-8 h-8 text-teal-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m5.232 4.195 3.297-3.297m0 0a1.125 1.125 0 0 1 1.584 1.584l-3.297 3.297m-3.515-1.5 1.414 1.414L15 21l-.412.124a1.875 1.875 0 0 1-2.185-.791L8.204 15H5.25a2.25 2.25 0 0 1-2.25-2.25V7.5M10.75 4h-.5a.75.75 0 0 0-.75.75v.5a.75.75 0 0 0 .75.75h.5a.75.75 0 0 0 .75-.75v-.5a.75.75 0 0 0-.75-.75Zm0 13h-.5a.75.75 0 0 0-.75.75v.5a.75.75 0 0 0 .75.75h.5a.75.75 0 0 0 .75-.75v-.5a.75.75 0 0 0-.75-.75Z" />
                </svg>
                Gestion des Prescriptions Médicales
            </h2>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <button onClick={() => showForm()} className="flex-1 sm:flex-grow-0 flex items-center justify-center px-4 py-2 rounded-xl text-white font-bold transition-all shadow-md bg-teal-600 hover:bg-teal-700 focus:ring-4 focus:ring-teal-200">
                    <svg className="icon mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                    Ajouter
                </button>
                <button onClick={handleExportExcel} className="flex-1 sm:flex-grow-0 flex items-center justify-center px-4 py-2 rounded-xl text-white font-bold transition-all shadow-md bg-emerald-600 hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-200">
                    <svg className="icon mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                    Exporter en Excel
                </button>
            </div>
        </div>

        {/* Formulaire d'ajout/modification */}
        <form 
          onSubmit={handleSubmit} 
          className={`mb-8 p-6 bg-teal-50 rounded-xl shadow-lg border-l-4 border-teal-500 grid grid-cols-1 md:grid-cols-5 gap-4 transition-all duration-300 ${isFormVisible ? 'block' : 'hidden'}`}
        >
          <h3 id="form-title" className="md:col-span-5 text-xl font-bold text-teal-700 mb-2">
            <svg className="icon inline mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d={editingPrescription ? "m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 18.07a4.625 4.625 0 0 1-1.897 1.113L6.9 21l1.5-4.502a4.625 4.625 0 0 1 1.113-1.897l12.42-12.42Z" : "M12 4.5v15m7.5-7.5h-15"} /></svg>
            {editingPrescription ? 'Modifier la Prescription' : 'Ajouter une Prescription'}
          </h3>
          
          {/* Champ Consultation ID */}
          <select 
            id="idConsult" 
            name="idConsult" 
            required 
            defaultValue={editingPrescription?.idConsult || ''}
            className="p-3 rounded-lg border border-gray-300 w-full bg-white shadow-sm focus:ring-teal-500 focus:border-teal-500"
          >
            <option value="">-- Consultation --</option>
            {consultations.map(consult => {
                const { patient, praticien, dateConsult } = getNames(consult.idConsult);
                return (
                    <option key={consult.idConsult} value={consult.idConsult}>
                        {`ID: ${consult.idConsult} | ${dateConsult} | Pat: ${patient.split(' ')[0]} | Dr: ${praticien.split(' ')[1]}`}
                    </option>
                );
            })}
          </select>
          
          <input 
            id="typePrescrire" 
            type="text" 
            name="typePrescrire" 
            placeholder="Type" 
            required 
            defaultValue={editingPrescription?.typePrescrire || ''}
            className="p-3 rounded-lg border border-gray-300 w-full shadow-sm focus:ring-teal-500 focus:border-teal-500" 
          />
          
          <input 
            id="posologie" 
            type="text" 
            name="posologie" 
            placeholder="Posologie" 
            required 
            defaultValue={editingPrescription?.posologie || ''}
            className="p-3 rounded-lg border border-gray-300 w-full shadow-sm focus:ring-teal-500 focus:border-teal-500" 
          />
          
          <input 
            id="datePrescrire" 
            type="date" 
            name="datePrescrire" 
            placeholder="Date" 
            required 
            defaultValue={editingPrescription?.datePrescrire?.slice(0, 10) || ''}
            className="p-3 rounded-lg border border-gray-300 w-full shadow-sm focus:ring-teal-500 focus:border-teal-500" 
          />
          
          <div className="md:col-span-1 flex gap-3">
              <button 
                id="submit-btn" 
                type="submit" 
                className="flex-1 px-4 py-3 rounded-xl text-white font-bold transition-all shadow-md bg-teal-600 hover:bg-teal-700 disabled:opacity-50"
              >
                {editingPrescription ? 'Modifier' : 'Ajouter'}
              </button>
              <button 
                type="button" 
                onClick={handleCancel} 
                className="flex-1 px-4 py-3 rounded-xl bg-gray-500 text-white font-bold hover:bg-gray-600 transition-all shadow-md"
              >
                  Annuler
              </button>
          </div>
        </form>

        {/* Filtres de Recherche */}
        <div className="p-4 mb-6 bg-gray-50 rounded-xl shadow-inner border border-gray-200">
            <h3 className="text-lg font-semibold text-teal-700 mb-3 flex items-center gap-2">
                <svg className="icon w-5 h-5 text-teal-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.197 5.197a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
                Filtrer les prescriptions
            </h3>
            <div className="flex flex-col md:flex-row gap-4">
                <input
                    type="text"
                    id="search-type"
                    placeholder="Recherche par type de méd."
                    value={search.type}
                    onChange={handleSearch}
                    className="p-3 rounded-lg border border-gray-300 w-full focus:ring-teal-500 focus:border-teal-500 transition duration-150 shadow-sm"
                    aria-label="Recherche par type de méd."
                />
                <input
                    type="text"
                    id="search-posologie"
                    placeholder="Recherche par posologie"
                    value={search.posologie}
                    onChange={handleSearch}
                    className="p-3 rounded-lg border border-gray-300 w-full focus:ring-teal-500 focus:border-teal-500 transition duration-150 shadow-sm"
                    aria-label="Recherche par posologie"
                />
            </div>
        </div>
        
        {loading && (
            <div className="text-center my-8 text-teal-600 font-semibold text-lg" role="status">
                <svg className="icon w-6 h-6 inline mr-2 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20h-5v-5M15 4a6 6 0 0 0-6 6 6 6 0 0 0 6 6 6 6 0 0 0 6-6 6 6 0 0 0-6-6Z" /></svg>
                Chargement des données...
            </div>
        )}

        {/* Tableau (Desktop) */}
        {!loading && (
          <div className="overflow-x-auto min-[901px]:block hidden">
            <table className="w-full border-collapse bg-white rounded-xl shadow-lg overflow-hidden">
                <thead>
                    <tr className="bg-teal-600 text-white text-base">
                        {[
                          { key: 'idPrescrire', label: 'ID' },
                          { key: 'patient', label: 'Patient' },
                          { key: 'praticien', label: 'Praticien' },
                          { key: 'typePrescrire', label: 'Type' },
                          { key: 'posologie', label: 'Posologie' },
                          { key: 'datePrescrire', label: 'Date' },
                        ].map(({ key, label }) => (
                            <th 
                                key={key}
                                className="p-4 cursor-pointer text-left font-semibold" 
                                onClick={() => handleSort(key)}
                            >
                                {label}
                                <span className="ml-1">
                                    {sort.key === key && (
                                        sort.asc 
                                          ? <svg className="icon w-4 h-4 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" /></svg> 
                                          : <svg className="icon w-4 h-4 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                                    )}
                                </span>
                            </th>
                        ))}
                        <th className="p-4 text-center">Détails</th>
                        <th className="p-4 text-center">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {paginatedPrescriptions.length > 0 ? (
                        paginatedPrescriptions.map(presc => (
                            <TableRow key={presc.idPrescrire} presc={presc} />
                        ))
                    ) : (
                        <tr>
                            <td colSpan="8" className="p-4 text-center text-gray-500 font-semibold">
                                Aucune prescription trouvée.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
          </div>
        )}

        {/* Cartes (Mobile) */}
        {!loading && (
          <div className="grid max-[900px]:grid-cols-1 gap-4 mt-8 min-[901px]:hidden">
              {paginatedPrescriptions.length > 0 ? (
                  paginatedPrescriptions.map(presc => (
                      <MobileCard key={presc.idPrescrire} presc={presc} />
                  ))
              ) : (
                  <div className="p-4 text-center text-gray-500 font-semibold bg-white rounded-xl shadow-lg">
                      Aucune prescription trouvée.
                  </div>
              )}
          </div>
        )}

        {/* Pagination */}
        {!loading && (
            <div className="flex justify-center items-center gap-6 my-6">
                <button 
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} 
                    disabled={currentPage === 1}
                    className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-bold disabled:opacity-50 hover:bg-gray-200 transition shadow-sm"
                >
                    Précédent
                </button>
                <span className="text-base font-bold text-gray-700">Page {currentPage} / {totalPages || 1}</span>
                <button 
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} 
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-bold disabled:opacity-50 hover:bg-gray-200 transition shadow-sm"
                >
                    Suivant
                </button>
            </div>
        )}
      </div>

      {/* Modale de Détails */}
      {isDetailModalOpen && selectedDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 transition-opacity" role="dialog" aria-modal="true">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-lg transition-transform border-t-4 border-teal-500">
                <h3 className="text-2xl font-bold mb-4 text-teal-700 flex items-center gap-2">
                    <svg className="icon w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m5.232 4.195 3.297-3.297m0 0a1.125 1.125 0 0 1 1.584 1.584l-3.297 3.297m-3.515-1.5 1.414 1.414L15 21l-.412.124a1.875 1.875 0 0 1-2.185-.791L8.204 15H5.25a2.25 2.25 0 0 1-2.25-2.25V7.5M10.75 4h-.5a.75.75 0 0 0-.75.75v.5a.75.75 0 0 0 .75.75h.5a.75.75 0 0 0 .75-.75v-.5a.75.75 0 0 0-.75-.75Zm0 13h-.5a.75.75 0 0 0-.75.75v.5a.75.75 0 0 0 .75.75h.5a.75.75 0 0 0 .75-.75v-.5a.75.75 0 0 0-.75-.75Z" /></svg>
                    Détails de la Prescription
                </h3>
                <div className="space-y-3 text-gray-700 p-4 bg-gray-50 rounded-lg">
                    <p className="border-b pb-2"><span className="font-semibold">Consultation ID :</span> {selectedDetail.idConsult}</p>
                    <p><span className="font-semibold">Type :</span> {selectedDetail.typePrescrire}</p>
                    <p><span className="font-semibold">Posologie :</span> {selectedDetail.posologie}</p>
                    <p><span className="font-semibold">Date :</span> {selectedDetail.datePrescrire}</p>
                    
                    <div className="pt-3 border-t border-gray-200">
                        <p className="font-semibold text-teal-600 mb-1">Informations Complémentaires de la Consultation :</p>
                        <div className="bg-white p-3 rounded shadow-inner text-sm space-y-1">
                            <p className="flex items-center gap-2"><svg className="w-4 h-4 text-emerald-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.25a.75.75 0 0 1 .184-.135L12 18l7.315 2.115a.75.75 0 0 1 .184.135A9 9 0 0 1 21.75 12V7.5a1.125 1.125 0 0 0-1.125-1.125H3.375A1.125 1.125 0 0 0 2.25 7.5v4.5a9 9 0 0 1 2.25 8.25Z" /></svg> <span className="font-semibold">Patient :</span> {selectedDetail.patient}</p>
                            <p className="flex items-center gap-2"><svg className="w-4 h-4 text-teal-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.796 60.796 0 0 0-.414 4.04c1.113-1.67 2.499-2.28 4.613-2.671L12 17.25l3.535-3.536c2.114.391 3.499 1 4.613 2.671-.161-.634-.414-2.126-1.077-4.04a60.796 60.796 0 0 0-.414-4.04l.158.077c.365.176.732.268 1.102.268.995 0 1.944-.393 2.65-1.1s1.102-1.655 1.102-2.65a2.766 2.766 0 0 0-.792-1.954 2.766 2.766 0 0 0-1.954-.792c-1.01 0-1.968.4-2.684 1.116-.716.716-1.116 1.674-1.116 2.684 0 .37.092.737.268 1.102l.077.158a60.796 60.796 0 0 0-.414 4.04v.085c-.015.056-.03.111-.045.166" /></svg> <span className="font-semibold">Praticien :</span> {selectedDetail.praticien}</p>
                            <p><span className="font-semibold">Date Consultation :</span> {selectedDetail.dateConsult}</p>
                            <p><span className="font-semibold">Compte Rendu :</span> {selectedDetail.compteRendu || 'N/A'}</p>
                        </div>
                    </div>
                </div>
                <button onClick={() => closeModal(setIsDetailModalOpen)} className="mt-6 px-4 py-2 bg-teal-600 text-white rounded-lg font-bold hover:bg-teal-700 transition shadow-md">
                    <svg className="w-5 h-5 inline mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                    Fermer
                </button>
            </div>
        </div>
      )}

      {/* Modale de Confirmation de Suppression */}
      {isDeleteModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 transition-opacity" role="dialog" aria-modal="true">
              <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm text-center border-t-4 border-red-500">
                  <svg className="w-10 h-10 text-red-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.2 9m-.06 3.957-2.13-2.126M18.17 6H5.83M6 6H5.83M6 6V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2" /></svg>
                  <h3 className="text-xl font-bold mb-4 text-gray-800">Êtes-vous sûr de vouloir supprimer cette prescription ?</h3>
                  <p className="mb-6 text-gray-600">Cette action est irréversible. Voulez-vous continuer ?</p>
                  <div className="flex justify-center gap-4">
                      <button onClick={() => closeModal(setIsDeleteModalOpen)} className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg font-bold hover:bg-gray-400 transition shadow-sm">
                          Annuler
                      </button>
                      <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition shadow-md">
                          Supprimer
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default App;