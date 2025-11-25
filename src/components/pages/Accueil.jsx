import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaUserMd, FaCalendarAlt, FaFileMedical, FaHeartbeat, FaUsers, FaUserShield, FaNotesMedical, FaUserInjured } from 'react-icons/fa';
import axios from 'axios';
import { Bar, Line } from 'react-chartjs-2'; // Import Chart types
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function Home() {
  const [counts, setCounts] = useState({
    praticiens: 0,
    rendezvous: 0,
    consultations: 0,
    prescriptions: 0,
    patients: 0,
    utilisateurs: 0,
  });
  const [adminName, setAdminName] = useState('');
  const [userName, setUserName] = useState('');
  const [monthlyPatients, setMonthlyPatients] = useState([]); // Data for monthly chart
  const [weeklyPatients, setWeeklyPatients] = useState([]);   // Data for weekly chart

  useEffect(() => {
    // --- Existing API Calls for Counts ---
    axios.get('http://localhost:3001/praticiens').then(res => {
      setCounts(c => ({ ...c, praticiens: res.data.length }));
    });
    axios.get('http://localhost:3001/rendezvous').then(res => {
      setCounts(c => ({ ...c, rendezvous: res.data.length }));
    });
    axios.get('http://localhost:3001/consultations').then(res => {
      setCounts(c => ({ ...c, consultations: res.data.length }));
    });
    axios.get('http://localhost:3001/prescriptions').then(res => {
      setCounts(c => ({ ...c, prescriptions: res.data.length }));
    });
    axios.get('http://localhost:3001/patients').then(res => {
      setCounts(c => ({ ...c, patients: res.data.length }));
    });
    // NOTE: La route /utilisateurs n'existe peut-être pas. Assurez-vous d'utiliser la bonne route (/users ou /admins)
    axios.get('http://localhost:3001/utilisateurs').then(res => {
      setCounts(c => ({ ...c, utilisateurs: res.data.length }));
    }).catch(() => {
      // Fallback si la route /utilisateurs échoue
      axios.get('http://localhost:3001/users').then(res => {
        setCounts(c => ({ ...c, utilisateurs: res.data.length }));
      });
    });

    axios.get('http://localhost:3001/admins')
      .then(res => {
        if (res.data && res.data.length > 0) {
          setAdminName(res.data[0].nom || res.data[0].email || 'Administrateur');
        } else {
          setAdminName('Administrateur');
        }
      })
      .catch(() => setAdminName('Administrateur'));

    const userId = localStorage.getItem('userId');
    if (userId) {
      // NOTE: Ajustez la route si /utilisateurs/:id n'est pas la bonne
      axios.get(`http://localhost:3001/utilisateurs/${userId}`)
        .then(res => {
          if (res.data && (res.data.nom || res.data.email)) {
            setUserName(res.data.nom || res.data.email);
          } else {
            setUserName('Utilisateur');
          }
        })
        .catch(() => setUserName('Utilisateur'));
    } else {
      setUserName('Utilisateur');
    }

    // --- New API Calls for Chart Data (Mock Data for demonstration) ---
    const fetchChartData = async () => {
      // Mock Monthly Data for the last 6 months
      const currentMonth = new Date().getMonth();
      const months = Array.from({ length: 6 }).map((_, i) => {
        const date = new Date();
        date.setMonth(currentMonth - (5 - i));
        return date.toLocaleString('fr-FR', { month: 'short' });
      });
      const monthlyData = Array.from({ length: 6 }).map(() => Math.floor(Math.random() * 50) + 20); // Random numbers

      setMonthlyPatients({
        labels: months,
        datasets: [{
          label: 'Nouveaux Patients',
          data: monthlyData,
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
          borderRadius: 4,
        }],
      });

      // Mock Weekly Data for the last 4 weeks
      const weeks = Array.from({ length: 4 }).map((_, i) => `Semaine ${new Date().getWeek() - (3 - i)}`);
      const weeklyData = Array.from({ length: 4 }).map(() => Math.floor(Math.random() * 30) + 10); // Random numbers

      setWeeklyPatients({
        labels: weeks,
        datasets: [{
          label: 'Nouveaux Patients',
          data: weeklyData,
          backgroundColor: 'rgba(153, 102, 255, 0.6)',
          borderColor: 'rgba(153, 102, 255, 1)',
          tension: 0.3, // Makes the line curved
          pointBackgroundColor: 'rgba(153, 102, 255, 1)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(153, 102, 255, 1)',
        }],
      });
    };

    fetchChartData();
  }, []);

  // Helper to get week number (approximation)
  Date.prototype.getWeek = function() {
    var date = new Date(this.getTime());
    date.setHours(0, 0, 0, 0);
    // Thursday in current week decides the year.
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    // January 4 is always in week 1.
    var week1 = new Date(date.getFullYear(), 0, 4);
    // Adjust to Sunday in week 1 and count number of weeks from date to week1.
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  };

  const AnimatedNumber = ({ value }) => (
    <motion.span
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7 }}
      className="text-2xl font-extrabold text-teal-600 dark:text-teal-400 block" // Smaller text
    >
      {value}
    </motion.span>
  );

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: 'rgb(107, 114, 128)' // Tailwind gray-500
        }
      },
      title: {
        display: true,
        text: '',
        color: 'rgb(107, 114, 128)' // Tailwind gray-500
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y + ' patients';
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        ticks: {
          color: 'rgb(107, 114, 128)' // Tailwind gray-500
        },
        grid: {
          color: 'rgba(229, 231, 235, 0.2)' // Light grid lines
        }
      },
      y: {
        ticks: {
          color: 'rgb(107, 114, 128)' // Tailwind gray-500
        },
        grid: {
          color: 'rgba(229, 231, 235, 0.2)' // Light grid lines
        }
      }
    }
  };

  return (
    <div 
      // MODIFICATION CLÉ DU FOND ICI: 
      // Thème Médical Clair: Dégradé du Blanc pur (white) à un Bleu Ciel très léger (blue-50/cyan-50)
      // Thème Médical Sombre: Dégradé d'un Gris très foncé (gray-900) à un Vert d'eau très foncé (teal-900)
      className="min-h-screen bg-gradient-to-br from-white to-blue-50 dark:from-gray-900 dark:to-teal-900 text-gray-800 dark:text-white font-sans"
    >
      {/* Admin and User Info Bar */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-gradient-to-r from-blue-100 to-white dark:from-gray-800 dark:to-gray-900 px-6 py-4 shadow-sm mb-6 rounded-b-xl border-b border-blue-200 dark:border-gray-700">
        <div className="flex items-center gap-6 mb-3 md:mb-0">
          <div className="flex items-center gap-3">
            <FaUserShield className="text-blue-700 dark:text-blue-300 text-2xl" />
            <span className="font-semibold text-gray-700 dark:text-gray-300">Admin :</span>
            <span className="text-blue-800 dark:text-blue-200 font-medium">{adminName}</span>
          </div>
          <div className="flex items-center gap-3">
            <FaUsers className="text-green-600 dark:text-green-300 text-xl" />
            <span className="font-semibold text-gray-700 dark:text-gray-300">Utilisateur connecté :</span>
            <span className="text-green-700 dark:text-green-200 font-medium">{userName}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <FaUsers className="text-green-600 dark:text-green-300 text-xl" />
          <span className="font-semibold text-gray-700 dark:text-gray-300">Total utilisateurs :</span>
          <span className="text-green-700 dark:text-green-200 font-medium">{counts.utilisateurs}</span>
        </div>
      </div>

      <header className="p-6 shadow-md bg-white/80 dark:bg-gray-900/80 flex justify-between items-center backdrop-blur-md rounded-lg mx-6">
        <h1 className="text-3xl font-extrabold text-blue-700 dark:text-blue-400">
          <FaNotesMedical className="inline-block mr-3 text-blue-600 dark:text-blue-300" />
          MedCare Dashboard
        </h1>
        <Link to="/patients">
          <button className="bg-blue-600 text-white px-5 py-2 rounded-lg shadow-md hover:bg-blue-700 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">
            Gérer les patients
          </button>
        </Link>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }}
        className="text-center mt-12 px-4"
      >
        <h2 className="text-3xl font-extrabold mb-3 text-gray-800 dark:text-white">Bienvenue, {userName}!</h2> {/* Slightly smaller */}
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto"> {/* Slightly smaller */}
          Votre plateforme centrale pour la gestion optimisée des soins médicaux.
        </p>
      </motion.div>

      {/* Animated and Responsive Summary Cards (Smaller Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 p-6 mt-10"> {/* Changed to 6 columns for smaller cards */}
        <motion.div
          whileHover={{ scale: 1.02, boxShadow: "0 6px 24px 0 rgba(0,128,128,0.1)" }} // Teal shadow, smaller scale
          className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex flex-col items-center border border-teal-100 dark:border-gray-700"
        >
          <FaUserMd className="text-4xl text-teal-600 mb-2 animate-bounce" /> {/* Smaller icon */}
          <h3 className="text-lg font-bold mb-1 text-gray-800 dark:text-white">Praticiens</h3> {/* Smaller text */}
          <AnimatedNumber value={counts.praticiens} />
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Médecins enregistrés</p> {/* Smaller text */}
          <Link to="/praticiens" className="mt-3 text-teal-600 hover:underline font-medium text-xs transition">Voir la liste</Link> {/* Smaller text */}
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02, boxShadow: "0 6px 24px 0 rgba(76,175,80,0.1)" }}
          className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex flex-col items-center border border-green-100 dark:border-gray-700"
        >
          <FaUserInjured className="text-4xl text-green-600 mb-2 animate-bounce" />
          <h3 className="text-lg font-bold mb-1 text-gray-800 dark:text-white">Patients</h3>
          <AnimatedNumber value={counts.patients} />
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Patients enregistrés</p>
          <Link to="/patients" className="mt-3 text-green-600 hover:underline font-medium text-xs transition">Voir la liste</Link>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02, boxShadow: "0 6px 24px 0 rgba(0,150,136,0.1)" }}
          className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex flex-col items-center border border-emerald-100 dark:border-gray-700"
        >
          <FaCalendarAlt className="text-4xl text-emerald-600 mb-2 animate-bounce" />
          <h3 className="text-lg font-bold mb-1 text-gray-800 dark:text-white">Rendez-vous</h3>
          <AnimatedNumber value={counts.rendezvous} />
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Total planifiés</p>
          <Link to="/rendezvous" className="mt-3 text-emerald-600 hover:underline font-medium text-xs transition">Voir la liste</Link>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02, boxShadow: "0 6px 24px 0 rgba(100,0,150,0.1)" }}
          className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex flex-col items-center border border-purple-100 dark:border-gray-700"
        >
          <FaFileMedical className="text-4xl text-purple-600 mb-2 animate-bounce" />
          <h3 className="text-lg font-bold mb-1 text-gray-800 dark:text-white">Consultations</h3>
          <AnimatedNumber value={counts.consultations} />
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Consultations réalisées</p>
          <Link to="/consultations" className="mt-3 text-purple-600 hover:underline font-medium text-xs transition">Voir la liste</Link>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02, boxShadow: "0 6px 24px 0 rgba(220,53,69,0.1)" }}
          className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex flex-col items-center border border-red-100 dark:border-gray-700"
        >
          <FaHeartbeat className="text-4xl text-red-600 mb-2 animate-bounce" />
          <h3 className="text-lg font-bold mb-1 text-gray-800 dark:text-white">Prescriptions</h3>
          <AnimatedNumber value={counts.prescriptions} />
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Ordonnances générées</p>
          <Link to="/prescriptions" className="mt-3 text-red-600 hover:underline font-medium text-xs transition">Voir la liste</Link>
        </motion.div>
         {/* Placeholder for an extra card to fill the grid if needed, or remove if only 5 items */}
        <motion.div
          whileHover={{ scale: 1.02, boxShadow: "0 6px 24px 0 rgba(230,126,34,0.1)" }}
          className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex flex-col items-center border border-yellow-100 dark:border-gray-700"
        >
          <FaUsers className="text-4xl text-yellow-600 mb-2 animate-bounce" />
          <h3 className="text-lg font-bold mb-1 text-gray-800 dark:text-white">Utilisateurs</h3>
          <AnimatedNumber value={counts.utilisateurs} />
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Accès système</p>
          <Link to="/utilisateurs" className="mt-3 text-yellow-600 hover:underline font-medium text-xs transition">Gérer les accès</Link>
        </motion.div>
      </div>

      {/* Chart.js Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
        {/* Monthly Patients Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-blue-100 dark:border-gray-700"
        >
          <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Nouveaux Patients par Mois</h3>
          {monthlyPatients.labels && <Bar data={monthlyPatients} options={{ ...chartOptions, plugins: { ...chartOptions.plugins, title: { ...chartOptions.plugins.title, text: 'Nouveaux Patients par Mois' } } }} />}
        </motion.div>

        {/* Weekly Patients Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.6 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-green-100 dark:border-gray-700"
        >
          <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Nouveaux Patients par Semaine</h3>
          {weeklyPatients.labels && <Line data={weeklyPatients} options={{ ...chartOptions, plugins: { ...chartOptions.plugins, title: { ...chartOptions.plugins.title, text: 'Nouveaux Patients par Semaine' } } }} />}
        </motion.div>
      </div>

      <style>{`
        .animate-bounce {
          animation: bounce 1.5s infinite;
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0);}
          50% { transform: translateY(-8px);} /* Slightly less bounce for smaller icons */
        }
      `}</style>
    </div>
  );
}