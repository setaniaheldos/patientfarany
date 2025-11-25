// src/components/FactureTousPatients.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const FactureTousPatients = () => {
  const { cinPatient } = useParams();

  const [patients, setPatients] = useState([]);
  const [rdvs, setRdvs] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [praticiens, setPraticiens] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Thème médical professionnel
  const theme = {
    primary: '#00838F',
    secondary: '#00ACC1',
    bg: '#F4F6F8',
    surface: '#FFFFFF',
    textDark: '#263238',
    textLight: '#546E7A',
    border: '#CFD8DC',
    success: '#43A047',
    warning: '#FF8F00',
    danger: '#D32F2F',
    hover: '#E0F7FA'
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pat, rdv, consult, presc, prat] = await Promise.all([
          axios.get('https://mon-api-rmv3.onrender.com/patients'),
          axios.get('https://mon-api-rmv3.onrender.com/rendezvous'),
          axios.get('https://mon-api-rmv3.onrender.com/consultations'),
          axios.get('https://mon-api-rmv3.onrender.com/prescriptions'),
          axios.get('https://mon-api-rmv3.onrender.com/praticiens')
        ]);

        let filteredPatients = pat.data;
        if (cinPatient) {
          filteredPatients = filteredPatients.filter(p => p.cinPatient === cinPatient);
          if (filteredPatients.length > 0) setSelectedPatient(filteredPatients[0]);
        }

        setPatients(filteredPatients);
        setRdvs(rdv.data);
        setConsultations(consult.data);
        setPrescriptions(presc.data);
        setPraticiens(prat.data);
        setLoading(false);
      } catch (err) {
        console.error("Erreur de chargement:", err);
        setLoading(false);
      }
    };
    fetchData();
  }, [cinPatient]);

  const normalize = (str) => str?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") || "";
  const filteredPatients = patients.filter(p =>
    normalize(`${p.prenom} ${p.nom}`).includes(normalize(searchTerm)) ||
    p.cinPatient.includes(searchTerm)
  );

  const getPraticienInfo = (cinPraticien) => {
    const prat = praticiens.find(p => p.cinPraticien === cinPraticien);
    return prat
      ? { nom: `${prat.prenom} ${prat.nom}`, specialite: prat.specialite || 'Non spécifiée' }
      : { nom: 'Inconnu', specialite: '-' };
  };

  const getPatientData = (patient) => {
    if (!patient) return { rdvDetails: [], total: '0.00' };

    const patientRdvs = rdvs.filter(r => r.cinPatient === patient.cinPatient);
    const patientConsults = consultations.filter(c => patientRdvs.some(r => r.idRdv === c.idRdv));

    const rdvDetails = patientRdvs.map(rdv => {
      const consult = patientConsults.find(c => c.idRdv === rdv.idRdv);
      const praticien = getPraticienInfo(rdv.cinPraticien);
      const consultPrescriptions = prescriptions.filter(p => p.idConsult === consult?.idConsult);

      const dateObj = rdv.dateHeure ? new Date(rdv.dateHeure) : null;
      const dateStr = dateObj ? dateObj.toLocaleDateString('fr-FR') : '-';
      const heureStr = dateObj ? dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';

      return {
        ...rdv,
        dateStr,
        heureStr,
        consult,
        praticienNom: praticien.nom,
        specialite: praticien.specialite,
        prix: consult?.prix || 0,
        compteRendu: consult?.compteRendu || 'Pas de compte-rendu',
        prescriptions: consultPrescriptions
      };
    });

    const total = rdvDetails.reduce((s, r) => s + parseFloat(r.prix || 0), 0).toFixed(2);
    return { rdvDetails, total };
  };

  const totalGeneral = filteredPatients.reduce((sum, p) => sum + parseFloat(getPatientData(p).total), 0).toFixed(2);

  // === GÉNÉRATION PDF PRO ===
  const generatePDF = (e, patient) => {
    e.stopPropagation();
    const { rdvDetails, total } = getPatientData(patient);
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    // En-tête du cabinet
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(0, 131, 143);
    doc.text('CABINET MÉDICAL ANDRANOMADIO', pageWidth / 2, 18, { align: 'center' });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Parcelle 11/43 Andranomadio - Toamasina', pageWidth / 2, 25, { align: 'center' });
    doc.text('Tél : 038 95 067 30', pageWidth / 2, 30, { align: 'center' });

    doc.setDrawColor(0, 131, 143);
    doc.setLineWidth(0.5);
    doc.line(15, 35, pageWidth - 15, 35);

    // Titre
    doc.setTextColor(0, 131, 143);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('RELEVÉ DE FACTURATION', pageWidth / 2, 45, { align: 'center' });

    // Infos patient
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Patient : ${patient.prenom} ${patient.nom.toUpperCase()}`, 15, 55);
    doc.text(`CIN : ${patient.cinPatient}`, 15, 61);
    doc.text(`Date d'émission : ${new Date().toLocaleDateString('fr-FR')}`, 15, 67);

    if (rdvDetails.length > 0) {
      const rows = rdvDetails.map(r => [
        r.dateStr,
        r.heureStr,
        r.praticienNom,
        r.specialite,
        parseFloat(r.prix || 0).toFixed(2) + ' DT'
      ]);

      doc.autoTable({
        startY: 78,
        head: [['Date', 'Heure', 'Praticien', 'Spécialité', 'Prix']],
        body: rows,
        foot: [['', '', '', 'TOTAL', total + ' DT']],
        theme: 'striped',
        headStyles: { fillColor: [0, 131, 143], textColor: [255, 255, 255] },
        footStyles: { fillColor: [230, 245, 233], textColor: [0, 131, 143], fontStyle: 'bold', fontSize: 13 },
        columnStyles: { 4: { halign: 'right' } },
        styles: { fontSize: 10 }
      });

      // Prescriptions après le tableau
      let y = doc.lastAutoTable.finalY + 15;
      rdvDetails.forEach(r => {
        if (r.prescriptions.length > 0) {
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(255, 140, 0);
          doc.text(`Prescriptions du ${r.dateStr} à ${r.heureStr}`, 15, y);
          y += 7;
          doc.setFontSize(10);
          doc.setTextColor(0, 0, 0);
          doc.setFont('helvetica', 'normal');
          r.prescriptions.forEach(p => {
            doc.text(`• ${p.typePrescrire} – ${p.posologie}`, 20, y);
            y += 6;
          });
          y += 8;
        }
      });
    } else {
      doc.setFontSize(12);
      doc.text("Aucune consultation enregistrée.", 15, 90);
    }

    // Pied de page
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('Cabinet Médical Andranomadio - Toamasina', pageWidth / 2, 290, { align: 'center' });

    doc.save(`Facture_${patient.nom}_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  const printPatient = (e, patient) => {
    e.stopPropagation();
    const { rdvDetails, total } = getPatientData(patient);
    const printWin = window.open('', '', 'width=1000,height=800');
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Facture - ${patient.nom}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
          .header { text-align: center; color: #00838F; border-bottom: 3px solid #00838F; padding-bottom: 15px; }
          .info { background: #f5f9ff; padding: 15px; border-radius: 8px; margin: 20px 0; }
          table { width: 100%; border-collapse: collapse; margin: 25px 0; }
          th { background: #00838F; color: white; padding: 12px; }
          td { padding: 12px; border-bottom: 1px solid #ddd; }
          .prescription { background: #fff8e1; padding: 12px; border-left: 5px solid #FF8F00; margin: 15px 0; border-radius: 4px; }
          .total { font-size: 22px; font-weight: bold; text-align: right; color: #00838F; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>CABINET MÉDICAL ANDRANOMADIO</h1>
          <p>Parcelle 11/43 Andranomadio - Toamasina | Tél : 038 95 067 30</p>
        </div>
        <h2 style="text-align:center;color:#00838F;margin:30px 0">RELEVÉ DE FACTURATION</h2>
        <div class="info">
          <strong>Patient :</strong> ${patient.prenom} ${patient.nom.toUpperCase()}<br>
          <strong>CIN :</strong> ${patient.cinPatient}<br>
          <strong>Date :</strong> ${new Date().toLocaleDateString('fr-FR')}
        </div>
        <table>
          <thead><tr><th>Date</th><th>Heure</th><th>Praticien</th><th>Acte</th><th>Prix</th></tr></thead>
          <tbody>
            ${rdvDetails.map(r => `
              <tr>
                <td>${r.dateStr}</td>
                <td>${r.heureStr}</td>
                <td>${r.praticienNom}</td>
                <td>${r.specialite}</td>
                <td><strong>${parseFloat(r.prix).toFixed(2)} DT</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ${rdvDetails.some(r => r.prescriptions.length > 0) ? `
          <h3 style="color:#FF8F00">Prescriptions</h3>
          ${rdvDetails.filter(r => r.prescriptions.length > 0).map(r => `
            <div class="prescription">
              <strong>${r.dateStr} à ${r.heureStr}</strong><br>
              ${r.prescriptions.map(p => `• ${p.typePrescrire} – ${p.posologie}`).join('<br>')}
            </div>
          `).join('')}
        ` : ''}
        <div class="total">TOTAL À PAYER : ${total} DT</div>
      </body>
      </html>
    `);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 1000);
  };

  if (loading) {
    return (
      <div style={{ padding: '100px', textAlign: 'center', fontSize: '20px', color: theme.primary }}>
        Chargement des données...
      </div>
    );
  }

  const modalData = selectedPatient ? getPatientData(selectedPatient) : null;

  return (
    <>
      <style jsx>{`
        .btn { padding: 8px 14px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; margin: 0 4px; }
        .btn-view { background: #E8F5E9; color: #2E7D32; }
        .btn-pdf { background: #FFEBEE; color: #D32F2F; }
        .btn-print { background: #E3F2FD; color: #1976D2; }
        .pill { display: inline-block; background: #FFF3E0; color: #EF6C00; padding: 4px 10px; border-radius: 20px; font-size: 11px; margin: 2px 4px 2px 0; }
      `}</style>

      <div style={{ fontFamily: "'Segoe UI', sans-serif", background: theme.bg, minHeight: '100vh', padding: '30px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
            <div>
              <h1 style={{ color: theme.primary, margin: 0, fontSize: '30px' }}>Facturation Patients</h1>
              <p style={{ color: theme.textLight, margin: '5px 0' }}>Consultations • Prescriptions • Relevés</p>
            </div>
            <input
              type="text"
              placeholder="Rechercher patient (nom / CIN)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '400px', padding: '14px 20px', borderRadius: '30px', border: `1px solid ${theme.border}`, fontSize: '16px' }}
            />
          </div>

          <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: theme.primary, color: 'white' }}>
                <tr>
                  <th style={{ padding: '18px', textAlign: 'left' }}>CIN</th>
                  <th style={{ padding: '18px', textAlign: 'left' }}>Patient</th>
                  <th style={{ padding: '18px', textAlign: 'left' }}>Contact</th>
                  <th style={{ padding: '18px', textAlign: 'right' }}>Total Facturé</th>
                  <th style={{ padding: '18px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map(patient => {
                  const { total } = getPatientData(patient);
                  return (
                    <tr key={patient.cinPatient} style={{ cursor: 'pointer' }} onClick={() => setSelectedPatient(patient)}>
                      <td style={{ padding: '16px', fontWeight: '600', color: theme.textLight }}>{patient.cinPatient}</td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ fontWeight: 'bold', color: theme.textDark }}>{patient.nom.toUpperCase()} {patient.prenom}</div>
                        <small style={{ color: theme.textLight }}>{patient.age} ans • {patient.sexe}</small>
                      </td>
                      <td style={{ padding: '16px', color: theme.textLight }}>
                        {patient.telephone || '-'}<br />
                        <small>{patient.email || 'Non renseigné'}</small>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right', fontWeight: 'bold', color: theme.primary, fontSize: '18px' }}>
                        {total} DT
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <button className="btn btn-view" onClick={() => setSelectedPatient(patient)}>Voir</button>
                        <button className="btn btn-pdf" onClick={(e) => generatePDF(e, patient)}>PDF</button>
                        <button className="btn btn-print" onClick={(e) => printPatient(e, patient)}>Imprimer</button>
                      </td>
                    </tr>
                  );
                })}
                <tr style={{ background: '#E8F5E9', fontWeight: 'bold' }}>
                  <td colSpan="3" style={{ padding: '20px', textAlign: 'right' }}>CHIFFRE D'AFFAIRES TOTAL</td>
                  <td style={{ padding: '20px', textAlign: 'right', fontSize: '22px', color: theme.primary }}>{totalGeneral} DT</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* MODALE DÉTAILLÉE */}
          {selectedPatient && modalData && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }} onClick={() => setSelectedPatient(null)}>
              <div style={{ background: 'white', width: '95%', maxWidth: '1100px', maxHeight: '90vh', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
                <div style={{ padding: '20px 30px', background: theme.primary, color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2 style={{ margin: 0 }}>Dossier complet – {selectedPatient.prenom} {selectedPatient.nom.toUpperCase()}</h2>
                    <p style={{ margin: '5px 0 0', opacity: 0.9 }}>CIN : {selectedPatient.cinPatient}</p>
                  </div>
                  <button onClick={() => setSelectedPatient(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', width: '40px', height: '40px', borderRadius: '50%', fontSize: '24px', cursor: 'pointer' }}>×</button>
                </div>
                <div style={{ padding: '30px', overflowY: 'auto', maxHeight: '70vh' }}>
                  {modalData.rdvDetails.length === 0 ? (
                    <p style={{ textAlign: 'center', color: theme.textLight, fontSize: '18px', padding: '60px' }}>Aucune consultation enregistrée.</p>
                  ) : (
                    modalData.rdvDetails.map((rdv, i) => (
                      <div key={i} style={{ marginBottom: '25px', padding: '20px', border: '1px solid #eee', borderRadius: '12px', background: '#fafafa' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                          <h3 style={{ margin: 0 }}>{rdv.dateStr} à {rdv.heureStr}</h3>
                          <div style={{ fontSize: '20px', fontWeight: 'bold', color: theme.primary }}>{parseFloat(rdv.prix).toFixed(2)} DT</div>
                        </div>
                        <p><strong>Praticien :</strong> {rdv.praticienNom} • {rdv.specialite}</p>

                        {rdv.prescriptions.length > 0 && (
                          <div style={{ background: '#FFF3E0', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #FF8F00', margin: '12px 0' }}>
                            <strong style={{ color: '#EF6C00' }}>Prescriptions :</strong>
                            {rdv.prescriptions.map((p, idx) => (
                              <div key={idx} style={{ marginTop: '6px' }}>
                                <span className="pill">{p.typePrescrire}</span> {p.posologie}
                              </div>
                            ))}
                          </div>
                        )}

                        {rdv.compteRendu && rdv.compteRendu !== 'Pas de compte-rendu' && (
                          <div style={{ background: '#E3F2FD', padding: '12px', borderRadius: '8px', fontStyle: 'italic', color: '#1565C0', marginTop: '12px' }}>
                            <strong>Note :</strong> {rdv.compteRendu}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                  <div style={{ textAlign: 'right', padding: '20px', background: '#E8F5E9', borderRadius: '12px' }}>
                    <h2 style={{ margin: 0, color: theme.primary }}>TOTAL : {modalData.total} DT</h2>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default FactureTousPatients;