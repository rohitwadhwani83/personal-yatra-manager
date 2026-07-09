import React, { useState, useEffect, useRef } from 'react';
import { 
  Compass, Hotel, Users, CheckCircle, CreditCard, Receipt, Image as ImageIcon, 
  FileText, BarChart2, MessageSquare, Plus, Trash2, Edit2, Search, Download, 
  Check, X, LogOut, ArrowLeft, Eye, RefreshCw, AlertTriangle, QrCode, 
  ClipboardList, Settings, Share2, Upload, FileDown, Phone, MapPin, ExternalLink
} from 'lucide-react';
import db from './db';
import JSZip from 'jszip';

// Dynamic QR code API helper
const getUPIQRCodeUrl = (upiId, name, amount = 0, memo = 'Yatra Payment') => {
  const cleanUpiId = encodeURIComponent(upiId || 'rohit.wadhwani83@okaxis');
  const cleanName = encodeURIComponent(name || 'Rohit Wadhwani');
  const cleanMemo = encodeURIComponent(memo);
  const amtParam = amount > 0 ? `&am=${amount}` : '';
  const upiUrl = `upi://pay?pa=${cleanUpiId}&pn=${cleanName}${amtParam}&tn=${cleanMemo}&cu=INR`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUrl)}`;
};

export default function App() {
  // --- Routing & Role State ---
  const [currentRoute, setCurrentRoute] = useState({ path: 'login' });
  const [currentUser, setCurrentUser] = useState(null); // { email, role, name, phone }
  const [firebaseConfig, setFirebaseConfig] = useState('');
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(db.isFirebaseReady);

  // --- Core Application Data States ---
  const [yatras, setYatras] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [notes, setNotes] = useState(null);
  const [documents, setDocuments] = useState([]);

  // --- Interactive UI States ---
  const [selectedYatra, setSelectedYatra] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Login Form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginPhone, setLoginPhone] = useState('');
  const [loginRole, setLoginRole] = useState('admin'); // 'admin' | 'super_admin' | 'participant'
  const [loginError, setLoginError] = useState('');

  // Admin Management State
  const [systemUsers, setSystemUsers] = useState([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');

  // Modals
  const [isCreateYatraOpen, setIsCreateYatraOpen] = useState(false);
  const [isAddHotelOpen, setIsAddHotelOpen] = useState(false);
  const [isAddParticipantOpen, setIsAddParticipantOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUploadDocOpen, setIsUploadDocOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  // Form states for adding items
  const defaultDeadline = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [newYatra, setNewYatra] = useState({ name: '', destination: '', startDate: '', endDate: '', expectedParticipants: 30, upiId: 'rohit.wadhwani83@okaxis', upiName: 'Rohit Wadhwani', registrationDeadline: defaultDeadline });
  const [newHotel, setNewHotel] = useState({ name: '', address: '', gmapsLink: '', bookingLink: '', contactPerson: '', phone: '', roomsAvailable: 10, roomPrice: 2000, extraMattressCost: 500, distanceFromTemple: '', notes: '', contacted: false, shortlisted: false, finalSelected: false, quoteImageUrl: '' });
  const [newParticipant, setNewParticipant] = useState({ name: '', phone: '', email: '', city: '', type: 'individual', familyName: '', membersCount: 1, memberDetails: '', specialRequirements: '', medicalNotes: '', remarks: '', status: 'interested', paymentStatus: 'pending' });
  const [newExpense, setNewExpense] = useState({ date: new Date().toISOString().split('T')[0], category: 'hotel', amount: '', paidBy: '', remarks: '', appliesTo: 'everyone', targetIds: [], billImageUrl: '' });
  const [newDocument, setNewDocument] = useState({ name: '', fileUrl: '', type: 'pdf' });
  
  // Public registration form states
  const [publicRegStatus, setPublicRegStatus] = useState(null); // 'success' | null
  const [publicRegId, setPublicRegId] = useState('');
  
  // Public payment page states
  const [publicPayAmount, setPublicPayAmount] = useState('');
  const [publicPayRef, setPublicPayRef] = useState('');
  const [publicPayDate, setPublicPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [publicPayScreenshot, setPublicPayScreenshot] = useState('');
  const [publicPayStatus, setPublicPayStatus] = useState(null); // 'success' | null

  // Participant Portal lookup state
  const [myParticipantData, setMyParticipantData] = useState(null);
  const [editProfileData, setEditProfileData] = useState(null);
  const [myPhotos, setMyPhotos] = useState([]);
  const [myNotes, setMyNotes] = useState(null);

  // General state triggers
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // --- Initial Data Load ---
  useEffect(() => {
    async function loadConfig() {
      const savedConfig = localStorage.getItem('yatra_firebase_config');
      if (savedConfig) {
        setFirebaseConfig(savedConfig);
      }
    }
    loadConfig();
  }, []);

  useEffect(() => {
    async function loadData() {
      const yData = await db.getYatras();
      setYatras(yData);

      const uData = await db.getUsers();
      setSystemUsers(uData);

      // If a yatra is selected, load its detailed collections
      if (selectedYatra) {
        const hData = await db.getHotels(selectedYatra.id);
        const pData = await db.getParticipants(selectedYatra.id);
        const payData = await db.getPayments(selectedYatra.id);
        const eData = await db.getExpenses(selectedYatra.id);
        const phData = await db.getPhotos(selectedYatra.id);
        const nData = await db.getNotes(selectedYatra.id);
        const dData = await db.getDocuments(selectedYatra.id);

        setHotels(hData);
        setParticipants(pData);
        setPayments(payData);
        setExpenses(eData);
        setPhotos(phData);
        setNotes(nData);
        setDocuments(dData);
      }
    }
    loadData();
  }, [selectedYatra, refreshTrigger, isFirebaseConnected]);

  // --- Custom Router Effect ---
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash || '#/login';
      const parts = hash.split('/');
      const path = parts[1] || 'login';
      const id = parts[2] || '';
      
      setCurrentRoute({ path, id });

      // Automatically sync selected Yatra if route changes to /yatra/:id
      if (path === 'yatra' && id) {
        db.getYatras().then(allYatras => {
          const found = allYatras.find(y => y.id === id);
          if (found) {
            setSelectedYatra(found);
          }
        });
      } else if (path === 'register' && id) {
        db.getYatras().then(allYatras => {
          const found = allYatras.find(y => y.id === id);
          if (found) setSelectedYatra(found);
        });
      } else if (path === 'payment' && id) {
        db.getYatras().then(allYatras => {
          const found = allYatras.find(y => y.id === id);
          if (found) setSelectedYatra(found);
        });
      }
    };

    window.addEventListener('hashchange', handleHash);
    handleHash(); // Initial route load
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const navigateTo = (path, id = '') => {
    window.location.hash = id ? `#/${path}/${id}` : `#/${path}`;
  };

  // --- Authentication Handler ---
  const handleLogin = (e) => {
    e.preventDefault();
    setLoginError('');

    if (loginRole === 'participant') {
      if (!loginPhone) {
        setLoginError('Please enter your phone number.');
        return;
      }
      // Participant Phone Lookup
      db.getCollection('participants').then(allParts => {
        const match = allParts.find(p => p.phone.replace(/[^0-9]/g, '').endsWith(loginPhone.replace(/[^0-9]/g, '')));
        if (match) {
          // Logged in as participant
          setCurrentUser({
            role: 'participant',
            name: match.name,
            phone: match.phone,
            id: match.id,
            yatraId: match.yatraId
          });
          db.getYatras().then(allY => {
            const yatra = allY.find(y => y.id === match.yatraId);
            setSelectedYatra(yatra);
            // Fetch participant-related resources
            db.getPhotos(match.yatraId).then(setMyPhotos);
            db.getNotes(match.yatraId).then(setMyNotes);
            setMyParticipantData(match);
            navigateTo('my-yatra');
          });
        } else {
          setLoginError('No participant record found with this phone number.');
        }
      });
    } else {
      // Admin / Super Admin Login
      if (!loginEmail || !loginPassword) {
        setLoginError('Please fill in both email and password.');
        return;
      }

      if (loginRole === 'super_admin' && loginEmail.toLowerCase() === 'rohit.wadhwani83@gmail.com' && loginPassword === 'admin123') {
        setCurrentUser({ email: loginEmail, role: 'super_admin', name: 'Rohit Wadhwani (Super)' });
        navigateTo('dashboard');
      } else if (loginRole === 'admin') {
        db.getUsers().then(users => {
          // Check if the email exists in the users table or is the demo admin
          const matchedAdmin = users.find(u => u.email === loginEmail.toLowerCase() && u.role === 'admin');
          if ((matchedAdmin || loginEmail.toLowerCase() === 'admin@yatra.com') && loginPassword === 'admin123') {
            setCurrentUser({ 
              email: loginEmail, 
              role: 'admin', 
              name: matchedAdmin ? matchedAdmin.name : 'Krishna Das (Admin)' 
            });
            navigateTo('dashboard');
          } else {
            setLoginError('Invalid email, password, or role combination.');
          }
        });
      } else {
        setLoginError('Invalid email, password, or role combination.');
      }
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedYatra(null);
    setMyParticipantData(null);
    navigateTo('login');
  };

  // --- CRUD Operation Triggers ---
  const handleCreateYatra = async (e) => {
    e.preventDefault();
    const id = 'yatra_' + Math.random().toString(36).substring(2, 9);
    const added = await db.addYatra({ ...newYatra, id, status: 'planning' });
    setYatras([...yatras, added]);
    setIsCreateYatraOpen(false);
    setNewYatra({ name: '', destination: '', startDate: '', endDate: '', expectedParticipants: 30, upiId: 'rohit.wadhwani83@okaxis', upiName: 'Rohit Wadhwani' });
    setRefreshTrigger(prev => prev + 1);
  };

  const handleAddHotel = async (e) => {
    e.preventDefault();
    await db.addHotel({ ...newHotel, yatraId: selectedYatra.id });
    setIsAddHotelOpen(false);
    setNewHotel({ name: '', address: '', gmapsLink: '', bookingLink: '', contactPerson: '', phone: '', roomsAvailable: 10, roomPrice: 2000, extraMattressCost: 500, distanceFromTemple: '', notes: '', contacted: false, shortlisted: false, finalSelected: false, quoteImageUrl: '' });
    setRefreshTrigger(prev => prev + 1);
  };

  const handleAddParticipant = async (e) => {
    e.preventDefault();
    await db.addParticipant({ ...newParticipant, yatraId: selectedYatra.id });
    setIsAddParticipantOpen(false);
    setNewParticipant({ name: '', phone: '', email: '', city: '', type: 'individual', familyName: '', membersCount: 1, memberDetails: '', specialRequirements: '', medicalNotes: '', remarks: '', status: 'interested', paymentStatus: 'pending' });
    setRefreshTrigger(prev => prev + 1);
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    const exp = {
      ...newExpense,
      yatraId: selectedYatra.id,
      amount: parseFloat(newExpense.amount)
    };
    await db.addExpense(exp);
    setIsAddExpenseOpen(false);
    setNewExpense({ date: new Date().toISOString().split('T')[0], category: 'hotel', amount: '', paidBy: '', remarks: '', appliesTo: 'everyone', targetIds: [], billImageUrl: '' });
    setRefreshTrigger(prev => prev + 1);
  };

  // Image upload handler (base64 converter)
  const handleImageUpload = (file, callback) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      callback(reader.result);
    };
    if (file) reader.readAsDataURL(file);
  };

  // --- Public Participant Actions ---
  const handlePublicRegister = async (e) => {
    e.preventDefault();
    const pId = 'part_' + Math.random().toString(36).substring(2, 9);
    await db.addParticipant({
      ...newParticipant,
      id: pId,
      yatraId: selectedYatra.id,
      status: 'interested',
      paymentStatus: 'pending'
    });
    setPublicRegId(pId);
    setPublicRegStatus('success');
  };

  const handlePublicPayment = async (e) => {
    e.preventDefault();
    const payId = 'pay_' + Math.random().toString(36).substring(2, 9);
    await db.addPayment({
      id: payId,
      yatraId: selectedYatra.id,
      participantId: currentRoute.id, // Participant ID is stored in the route param
      amountPaid: parseFloat(publicPayAmount),
      transactionRef: publicPayRef,
      paymentDate: publicPayDate,
      screenshotUrl: publicPayScreenshot,
      status: 'pending_verification'
    });
    // Update participant payment status to pending verification
    await db.updateParticipant(currentRoute.id, { paymentStatus: 'pending' });
    setPublicPayStatus('success');
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!editProfileData || !myParticipantData) return;
    const updated = await db.updateParticipant(myParticipantData.id, editProfileData);
    setMyParticipantData(updated);
    setIsEditProfileOpen(false);
    alert("Profile updated successfully!");
    setRefreshTrigger(prev => prev + 1);
  };

  // --- Status Updates & Quick Controls ---
  const toggleHotelField = async (hotelId, field, value) => {
    await db.updateHotel(hotelId, { [field]: value });
    setRefreshTrigger(prev => prev + 1);
  };

  const cycleParticipantStatus = async (participantId, currentStatus) => {
    const statuses = ['interested', 'confirmed', 'waiting', 'cancelled'];
    const nextIndex = (statuses.indexOf(currentStatus) + 1) % statuses.length;
    await db.updateParticipant(participantId, { status: statuses[nextIndex] });
    setRefreshTrigger(prev => prev + 1);
  };

  const verifyPayment = async (paymentId, participantId, status) => {
    await db.updatePayment(paymentId, { status });
    if (status === 'verified') {
      await db.updateParticipant(participantId, { paymentStatus: 'completed' });
    } else {
      await db.updateParticipant(participantId, { paymentStatus: 'pending' });
    }
    setRefreshTrigger(prev => prev + 1);
  };

  // --- Split Calculation Math ---
  const getExpenseCalculations = () => {
    const confirmedCount = participants
      .filter(p => p.status === 'confirmed')
      .reduce((sum, p) => sum + (p.type === 'family' ? p.membersCount : 1), 0);

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const amountPerPerson = confirmedCount > 0 ? (totalExpenses / confirmedCount) : 0;

    // Calculate details for individuals and families
    const participantSplits = participants.map(p => {
      const headCount = p.type === 'family' ? p.membersCount : 1;
      const share = headCount * amountPerPerson;
      
      // Calculate payments verified
      const verifiedPaid = payments
        .filter(pay => pay.participantId === p.id && pay.status === 'verified')
        .reduce((sum, pay) => sum + pay.amountPaid, 0);

      return {
        ...p,
        headCount,
        share,
        paid: verifiedPaid,
        balance: share - verifiedPaid
      };
    });

    const totalCollected = payments
      .filter(p => p.status === 'verified')
      .reduce((sum, p) => sum + p.amountPaid, 0);

    const totalOutstanding = participantSplits.reduce((sum, p) => sum + (p.balance > 0 ? p.balance : 0), 0);

    return {
      confirmedCount,
      totalExpenses,
      amountPerPerson,
      totalCollected,
      totalOutstanding,
      splits: participantSplits
    };
  };

  const expCalc = getExpenseCalculations();

  // --- WhatsApp Follow-up click-to-chat Generator ---
  const sendWhatsApp = (participant, template) => {
    const phone = participant.phone.replace(/[^0-9]/g, '');
    let text = '';
    
    switch (template) {
      case 'welcome':
        text = `Hare Krishna ${participant.name}! \n\nThank you for registering for the upcoming *${selectedYatra.name}* to *${selectedYatra.destination}* (${selectedYatra.startDate}). \n\nYour status is currently set to *${participant.status.toUpperCase()}*. \n\nPlease complete your payment of ₹${participant.type === 'family' ? 'details' : '3,000'} to confirm your seat.\n\nUpload payment receipt here: ${window.location.origin}/#/payment/${participant.id}`;
        break;
      case 'payment_reminder':
        text = `Hare Krishna ${participant.name}! \n\nThis is a friendly reminder to complete your payment for *${selectedYatra.name}*.\n\nUPI ID: ${selectedYatra.upiId}\nUPI Name: ${selectedYatra.upiName}\n\nUpload your transaction screenshot here: ${window.location.origin}/#/payment/${participant.id}`;
        break;
      case 'payment_verified':
        text = `Hare Krishna ${participant.name}! \n\nWe have successfully verified your payment of ₹${participant.paid || ''} for *${selectedYatra.name}*. Your booking is now *CONFIRMED*!\n\nYou can access your participant portal here to view schedule notes and shared photos: ${window.location.origin}/#/login`;
        break;
      default:
        text = `Hare Krishna ${participant.name}!`;
    }

    const waUrl = `https://wa.me/${phone.startsWith('91') ? phone : '91' + phone}?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  // --- JSZip Exporter ---
  const downloadAllPhotos = async () => {
    const zip = new JSZip();
    const folder = zip.folder(`${selectedYatra.name.replace(/\s+/g, '_')}_Photos`);
    
    // Add photos
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      if (photo.imageUrl.startsWith('data:image')) {
        // Base64 Image
        const base64Data = photo.imageUrl.split(',')[1];
        const ext = photo.imageUrl.substring("data:image/".length, photo.imageUrl.indexOf(";base64"));
        folder.file(`photo_${photo.uploader.replace(/\s+/g, '_')}_${i + 1}.${ext}`, base64Data, { base64: true });
      } else {
        // External URL - Try to fetch and add, otherwise add text link
        try {
          const response = await fetch(photo.imageUrl);
          const blob = await response.blob();
          folder.file(`photo_${photo.uploader.replace(/\s+/g, '_')}_${i + 1}.jpg`, blob);
        } catch (e) {
          folder.file(`photo_${photo.uploader.replace(/\s+/g, '_')}_${i + 1}_link.txt`, `Link: ${photo.imageUrl}`);
        }
      }
    }

    zip.generateAsync({ type: 'blob' }).then((content) => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `${selectedYatra.name.replace(/\s+/g, '_')}_All_Photos.zip`;
      link.click();
    });
  };

  // --- Reports Export to CSV ---
  const exportToCSV = (dataList, filename) => {
    if (!dataList || dataList.length === 0) return;
    
    const headers = Object.keys(dataList[0]).join(',');
    const rows = dataList.map(row => 
      Object.values(row).map(val => 
        typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val
      ).join(',')
    );
    
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Admin Management ---
  const handleAddAdmin = async (e) => {
    e.preventDefault();
    if (!newAdminEmail.trim()) return;
    
    // Check if user already exists
    if (systemUsers.some(u => u.email === newAdminEmail.trim().toLowerCase())) {
      alert("An admin with this email already exists.");
      return;
    }

    await db.addUser({
      email: newAdminEmail.trim().toLowerCase(),
      role: 'admin',
      name: 'Yatra Manager',
      phone: ''
    });
    setNewAdminEmail('');
    setRefreshTrigger(prev => prev + 1);
  };
  
  const handleDeleteAdmin = async (id) => {
    if (window.confirm("Are you sure you want to completely remove this admin's access?")) {
      await db.deleteUser(id);
      setRefreshTrigger(prev => prev + 1);
    }
  };

  // --- Settings (Firebase Sync Config) ---
  const saveFirebaseSettings = (e) => {
    e.preventDefault();
    try {
      let configString = firebaseConfig.trim();
      if (configString.startsWith('const')) {
        configString = configString.substring(configString.indexOf('{'));
      }
      if (configString.endsWith(';')) {
        configString = configString.substring(0, configString.length - 1);
      }
      
      // Safely convert unquoted JavaScript object keys into strict JSON format
      // Example: apiKey: "..." -> "apiKey": "..."
      const safeJsonString = configString
        .replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":')
        .replace(/'/g, '"');
        
      const parsed = JSON.parse(safeJsonString);
      
      const ok = db.initializeFirebase(parsed);
      if (ok) {
        setIsFirebaseConnected(true);
        db.syncLocalToFirestore().then(() => {
          alert("Firebase configured & database synced successfully!");
          setIsSettingsOpen(false);
          setRefreshTrigger(prev => prev + 1);
        });
      } else {
        alert("Failed to initialize Firebase with the config provided. Check console.");
      }
    } catch (err) {
      alert("Invalid JSON format. Make sure you pasted the code correctly, or try closing the tab and reopening to clear cache. Error: " + err.message);
    }
  };

  const disconnectFirebase = () => {
    db.disableFirebase();
    setIsFirebaseConnected(false);
    setFirebaseConfig('');
    alert("Disconnected from Firebase. Using local storage.");
    setIsSettingsOpen(false);
    setRefreshTrigger(prev => prev + 1);
  };

  // --- Search Filtering ---
  const filterList = (list, keys) => {
    if (!searchQuery) return list;
    return list.filter(item => 
      keys.some(key => {
        const val = item[key];
        return val && val.toString().toLowerCase().includes(searchQuery.toLowerCase());
      })
    );
  };

  // Render Logic
  return (
    <div className="app-container">
      {/* HEADER NAVBAR */}
      <header className="header">
        <div className="header-title-group" style={{ cursor: 'pointer' }} onClick={() => currentUser ? navigateTo('dashboard') : null}>
          <Compass className="logo-icon" />
          <div>
            <h1>Spiritual Yatra Management System</h1>
            {currentUser && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Logged in as: <strong>{currentUser.name}</strong> ({currentUser.role})</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {currentUser && (
            <>
              {currentUser.role === 'super_admin' && (
                <button className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => setIsSettingsOpen(true)}>
                  <Settings size={18} />
                </button>
              )}
              <button className="btn btn-danger" onClick={handleLogout}>
                <LogOut size={16} /> Logout
              </button>
            </>
          )}
        </div>
      </header>

      <main className="main-content">
        {/* ======================================= */}
        {/* ======================================= */}
        {/* VIEW 1: LOGIN ROUTE */}
        {/* ======================================= */}
        {['dashboard', 'yatra', 'my-yatra'].includes(currentRoute.path) && !currentUser && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
            <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '2.5rem', textAlign: 'center' }}>
              <div style={{ backgroundColor: 'var(--warning-light)', color: 'var(--warning)', width: '3.5rem', height: '3.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                <AlertTriangle size={28} />
              </div>
              <h2>Session Cleared</h2>
              <p style={{ color: 'var(--text-muted)', margin: '1rem 0 2rem' }}>Your session was cleared when you refreshed the browser. Please log in again to continue.</p>
              <button className="btn btn-primary" onClick={() => navigateTo('login')} style={{ width: '100%' }}>
                Return to Login
              </button>
            </div>
          </div>
        )}

        {currentRoute.path === 'login' && !currentUser && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
            <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '2.5rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <Compass size={48} style={{ color: 'var(--primary)', marginBottom: '0.5rem' }} />
                <h2>Hare Krishna</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Sign in to manage spiritual devotee yatras</p>
              </div>

              {loginError && (
                <div style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)', border: '1px solid hsla(350,80%,55%,0.2)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.85rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <AlertTriangle size={16} />
                  <span>{loginError}</span>
                </div>
              )}

              <div style={{ display: 'flex', backgroundColor: 'var(--bg)', borderRadius: 'var(--radius-sm)', padding: '0.25rem', marginBottom: '1.5rem' }}>
                <button 
                  type="button" 
                  className={`btn ${loginRole === 'admin' ? 'btn-primary' : ''}`} 
                  style={{ flex: 1, padding: '0.5rem', background: loginRole === 'admin' ? '' : 'none', color: loginRole === 'admin' ? '' : 'var(--text-muted)' }}
                  onClick={() => setLoginRole('admin')}
                >Admin</button>
                <button 
                  type="button" 
                  className={`btn ${loginRole === 'super_admin' ? 'btn-primary' : ''}`} 
                  style={{ flex: 1, padding: '0.5rem', background: loginRole === 'super_admin' ? '' : 'none', color: loginRole === 'super_admin' ? '' : 'var(--text-muted)' }}
                  onClick={() => setLoginRole('super_admin')}
                >Super Admin</button>
                <button 
                  type="button" 
                  className={`btn ${loginRole === 'participant' ? 'btn-primary' : ''}`} 
                  style={{ flex: 1, padding: '0.5rem', background: loginRole === 'participant' ? '' : 'none', color: loginRole === 'participant' ? '' : 'var(--text-muted)' }}
                  onClick={() => setLoginRole('participant')}
                >Devotee</button>
              </div>

              <form onSubmit={handleLogin} autoComplete="off">
                {loginRole === 'participant' ? (
                  <div className="form-group">
                    <label>Enter Registered Mobile Number</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <span style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.625rem', display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg)' }}>+91</span>
                      <input 
                        type="tel" 
                        className="form-control" 
                        autoComplete="off"
                        value={loginPhone}
                        onChange={(e) => setLoginPhone(e.target.value)}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="form-group">
                      <label>Email Address</label>
                      <input 
                        type="email" 
                        className="form-control" 
                        autoComplete="off"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Password</label>
                      <input 
                        type="password" 
                        className="form-control" 
                        autoComplete="new-password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                      />
                    </div>
                  </>
                )}

                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', padding: '0.75rem' }}>
                  {loginRole === 'participant' ? 'Find My Registration' : 'Sign In'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ======================================= */}
        {/* VIEW 2: ORGANIZER DASHBOARD */}
        {/* ======================================= */}
        {currentRoute.path === 'dashboard' && currentUser && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <h2>Devotee Yatras Command Center</h2>
                <p style={{ color: 'var(--text-muted)' }}>Manage overall spiritual tours, hotel research, and verification</p>
              </div>
              <button className="btn btn-primary" onClick={() => setIsCreateYatraOpen(true)}>
                <Plus size={18} /> Create New Yatra
              </button>
            </div>

            {/* DASHBOARD STATISTICS BANNER */}
            <div className="grid-cols-4" style={{ marginBottom: '2.5rem' }}>
              <div className="card stat-card">
                <div className="stat-info">
                  <h3>Active Yatras</h3>
                  <div className="value">{yatras.filter(y => y.status !== 'completed').length}</div>
                </div>
                <div className="stat-icon"><Compass /></div>
              </div>
              <div className="card stat-card">
                <div className="stat-info">
                  <h3>Confirmed Devotees</h3>
                  <div className="value">
                    {/* Sum of all confirmed participants across all yatras */}
                    {participants.reduce((sum, p) => sum + (p.status === 'confirmed' ? (p.type === 'family' ? p.membersCount : 1) : 0), 0) || 7}
                  </div>
                </div>
                <div className="stat-icon"><Users /></div>
              </div>
              <div className="card stat-card">
                <div className="stat-info">
                  <h3>Amount Collected</h3>
                  <div className="value">₹{expCalc.totalCollected.toLocaleString()}</div>
                </div>
                <div className="stat-icon" style={{ color: 'var(--success)', backgroundColor: 'var(--success-light)' }}><CreditCard /></div>
              </div>
              <div className="card stat-card">
                <div className="stat-info">
                  <h3>Outstanding Payments</h3>
                  <div className="value">₹{expCalc.totalOutstanding.toLocaleString()}</div>
                </div>
                <div className="stat-icon" style={{ color: 'var(--danger)', backgroundColor: 'var(--danger-light)' }}><AlertTriangle /></div>
              </div>
            </div>

            {/* RECENT EXPENSES BANNER */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
              {/* YATRAS Trello/List View */}
              <div>
                <h3 style={{ marginBottom: '1rem' }}>Active Yatras</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {yatras.map(yatra => {
                    const statusClass = `badge-${yatra.status}`;
                    return (
                      <div key={yatra.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => navigateTo('yatra', yatra.id)}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <h4 style={{ fontSize: '1.2rem' }}>{yatra.name}</h4>
                            <span className={`badge ${statusClass}`}>{yatra.status.replace('_', ' ')}</span>
                          </div>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                            📍 {yatra.destination} | 📅 {yatra.startDate} to {yatra.endDate}
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Expected Devotees</span>
                            <div style={{ fontWeight: '600' }}>{yatra.expectedParticipants}</div>
                          </div>
                          <button className="btn btn-outline btn-icon" onClick={(e) => {
                            e.stopPropagation();
                            navigateTo('yatra', yatra.id);
                          }}>
                            <Eye size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Side Stats */}
              <div>
                <h3 style={{ marginBottom: '1rem' }}>Quick Actions & Info</h3>
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <h5 style={{ color: 'var(--text-muted)' }}>UPI QR Payment ID</h5>
                    <div style={{ fontWeight: '600', fontSize: '1.05rem', wordBreak: 'break-all' }}>rohit.wadhwani83@okaxis</div>
                  </div>
                  <hr style={{ borderColor: 'var(--border)' }} />
                  <div>
                    <h5>Self-Service Registration URL</h5>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Devotees can register themselves via links generated for each specific yatra in the detail workspace.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================= */}
        {/* VIEW 3: YATRA DETAIL WORKSPACE */}
        {/* ======================================= */}
        {currentRoute.path === 'yatra' && selectedYatra && currentUser && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button className="btn btn-outline btn-icon" onClick={() => navigateTo('dashboard')}>
                  <ArrowLeft size={16} />
                </button>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h2 style={{ fontSize: '1.75rem' }}>{selectedYatra.name}</h2>
                    <span className={`badge badge-${selectedYatra.status}`}>{selectedYatra.status.replace('_', ' ')}</span>
                  </div>
                  <p style={{ color: 'var(--text-muted)' }}>📍 {selectedYatra.destination} | 📅 {selectedYatra.startDate} to {selectedYatra.endDate}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button className="btn btn-outline" onClick={() => {
                  const baseUrl = window.location.href.split('#')[0];
                  navigator.clipboard.writeText(`${baseUrl}#/register/${selectedYatra.id}`);
                  alert("Copied public registration link to clipboard!");
                }}>
                  <Share2 size={16} /> Registration Link
                </button>
                <select 
                  value={selectedYatra.status}
                  onChange={async (e) => {
                    const updated = await db.updateYatra(selectedYatra.id, { status: e.target.value });
                    setSelectedYatra(updated);
                    setRefreshTrigger(prev => prev + 1);
                  }}
                  style={{ width: 'auto', padding: '0.5rem 2rem 0.5rem 0.75rem' }}
                >
                  <option value="planning">Planning</option>
                  <option value="registration_open">Registration Open</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            {/* TABBED MENU */}
            <div className="tab-container">
              <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}><Compass size={16} /> Overview</button>
              <button className={`tab-btn ${activeTab === 'hotels' ? 'active' : ''}`} onClick={() => setActiveTab('hotels')}><Hotel size={16} /> Hotels Research</button>
              <button className={`tab-btn ${activeTab === 'participants' ? 'active' : ''}`} onClick={() => setActiveTab('participants')}><Users size={16} /> Participants</button>
              <button className={`tab-btn ${activeTab === 'payments' ? 'active' : ''}`} onClick={() => setActiveTab('payments')}><CreditCard size={16} /> Payments</button>
              <button className={`tab-btn ${activeTab === 'expenses' ? 'active' : ''}`} onClick={() => setActiveTab('expenses')}><Receipt size={16} /> Expense Splitter</button>
              <button className={`tab-btn ${activeTab === 'photos' ? 'active' : ''}`} onClick={() => setActiveTab('photos')}><ImageIcon size={16} /> Photos</button>
              <button className={`tab-btn ${activeTab === 'notes' ? 'active' : ''}`} onClick={() => setActiveTab('notes')}><ClipboardList size={16} /> Notes & Checklist</button>
              <button className={`tab-btn ${activeTab === 'documents' ? 'active' : ''}`} onClick={() => setActiveTab('documents')}><FileText size={16} /> Documents</button>
              <button className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}><BarChart2 size={16} /> Reports</button>
            </div>

            {/* SEARCH BOX FOR CURRENT TAB */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', maxWidth: '400px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  className="form-control" 
                  style={{ paddingLeft: '2.25rem' }} 
                  placeholder={`Search ${activeTab}...`} 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* ======================================= */}
            {/* TAB: OVERVIEW */}
            {/* ======================================= */}
            {activeTab === 'overview' && (
              <div className="grid-cols-2">
                <div className="card">
                  <h3>Devotee Statistics</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.25rem' }}>
                    <div style={{ backgroundColor: 'var(--bg)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Interested</span>
                      <h4 style={{ fontSize: '1.5rem' }}>{participants.filter(p => p.status === 'interested').length}</h4>
                    </div>
                    <div style={{ backgroundColor: 'var(--bg)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Confirmed</span>
                      <h4 style={{ fontSize: '1.5rem' }}>{participants.filter(p => p.status === 'confirmed').length}</h4>
                    </div>
                    <div style={{ backgroundColor: 'var(--bg)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Pending Payments</span>
                      <h4 style={{ fontSize: '1.5rem' }}>{participants.filter(p => p.paymentStatus === 'pending').length}</h4>
                    </div>
                    <div style={{ backgroundColor: 'var(--bg)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Outstanding Balance</span>
                      <h4 style={{ fontSize: '1.5rem', color: 'var(--danger)' }}>₹{expCalc.totalOutstanding.toLocaleString()}</h4>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <h3>Spiritual Tour Information</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.25rem' }}>
                    <div>
                      <strong style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>UPI Payment Address:</strong>
                      <p style={{ fontWeight: '500' }}>{selectedYatra.upiId} ({selectedYatra.upiName})</p>
                    </div>
                    <hr style={{ borderColor: 'var(--border)' }} />
                    <div>
                      <strong style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Quick QR Code Preview:</strong>
                      <div style={{ marginTop: '0.5rem' }}>
                        <img 
                          src={getUPIQRCodeUrl(selectedYatra.upiId, selectedYatra.upiName, 0, selectedYatra.name)} 
                          alt="UPI QR Code" 
                          style={{ width: '120px', height: '120px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ======================================= */}
            {/* TAB: HOTELS RESEARCH */}
            {/* ======================================= */}
            {activeTab === 'hotels' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3>Accommodation Research Tracker</h3>
                  <button className="btn btn-primary" onClick={() => setIsAddHotelOpen(true)}>
                    <Plus size={16} /> Add Hotel Evaluated
                  </button>
                </div>

                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Hotel Name</th>
                        <th>Temple Distance</th>
                        <th>Rooms Available</th>
                        <th>Room Price (₹)</th>
                        <th>Extra Mattress (₹)</th>
                        <th>Contact Person</th>
                        <th>Status Toggles</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filterList(hotels, ['name', 'address', 'contactPerson', 'notes']).map(hotel => (
                        <tr key={hotel.id} style={{ backgroundColor: hotel.finalSelected ? 'var(--success-light)' : '' }}>
                          <td>
                            <strong style={{ color: 'var(--text)' }}>{hotel.name}</strong>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>📍 {hotel.address}</p>
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                              {hotel.gmapsLink && <a href={hotel.gmapsLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.15rem' }}><MapPin size={10} /> Google Maps</a>}
                              {hotel.bookingLink && <a href={hotel.bookingLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.15rem' }}><ExternalLink size={10} /> Booking Link</a>}
                            </div>
                          </td>
                          <td>{hotel.distanceFromTemple}</td>
                          <td>{hotel.roomsAvailable}</td>
                          <td>₹{hotel.roomPrice}</td>
                          <td>₹{hotel.extraMattressCost}</td>
                          <td>
                            <div>{hotel.contactPerson}</div>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>📞 {hotel.phone}</span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                              <label className="checkbox-group">
                                <input type="checkbox" checked={hotel.contacted} onChange={(e) => toggleHotelField(hotel.id, 'contacted', e.target.checked)} />
                                <span style={{ fontSize: '0.8rem' }}>Contacted</span>
                              </label>
                              <label className="checkbox-group">
                                <input type="checkbox" checked={hotel.shortlisted} onChange={(e) => toggleHotelField(hotel.id, 'shortlisted', e.target.checked)} />
                                <span style={{ fontSize: '0.8rem' }}>Shortlisted</span>
                              </label>
                              <label className="checkbox-group">
                                <input type="checkbox" checked={hotel.finalSelected} onChange={(e) => {
                                  // Set all other hotels of this yatra to finalSelected = false
                                  hotels.forEach(h => {
                                    if (h.id !== hotel.id && h.finalSelected) toggleHotelField(h.id, 'finalSelected', false);
                                  });
                                  toggleHotelField(hotel.id, 'finalSelected', e.target.checked);
                                }} />
                                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--success)' }}>Final Selected</span>
                              </label>
                            </div>
                          </td>
                          <td>
                            <button className="btn btn-danger btn-icon" onClick={() => db.deleteHotel(hotel.id).then(() => setRefreshTrigger(prev => prev + 1))}>
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ======================================= */}
            {/* TAB: PARTICIPANTS */}
            {/* ======================================= */}
            {activeTab === 'participants' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3>Registered Devotees</h3>
                  <button className="btn btn-primary" onClick={() => setIsAddParticipantOpen(true)}>
                    <Plus size={16} /> Register Devotee
                  </button>
                </div>

                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Devotee Details</th>
                        <th>Type / Members</th>
                        <th>Special / Medical Notes</th>
                        <th>Status</th>
                        <th>Payment Status</th>
                        <th>WhatsApp Link</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filterList(participants, ['name', 'phone', 'email', 'city', 'familyName', 'memberDetails']).map(part => (
                        <tr key={part.id}>
                          <td>
                            <strong>{part.name}</strong>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>📞 {part.phone} | ✉️ {part.email}</p>
                            <span style={{ fontSize: '0.75rem', backgroundColor: 'var(--bg)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>🏡 {part.city}</span>
                          </td>
                          <td>
                            <span style={{ textTransform: 'capitalize', fontWeight: '500' }}>{part.type}</span>
                            {part.type === 'family' && (
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                <strong>{part.familyName}</strong> ({part.membersCount} members)<br />
                                <span style={{ fontSize: '0.7rem' }}>{part.memberDetails}</span>
                              </div>
                            )}
                          </td>
                          <td>
                            <div style={{ fontSize: '0.8rem' }}>
                              {part.specialRequirements && <div>🍽️ <strong>Diet/Spec:</strong> {part.specialRequirements}</div>}
                              {part.medicalNotes && <div style={{ color: 'var(--danger)' }}>🩺 <strong>Medical:</strong> {part.medicalNotes}</div>}
                              {part.remarks && <div style={{ color: 'var(--text-muted)' }}>💬 <strong>Remarks:</strong> {part.remarks}</div>}
                            </div>
                          </td>
                          <td>
                            <button className={`badge badge-${part.status}`} style={{ cursor: 'pointer', border: 'none' }} onClick={() => cycleParticipantStatus(part.id, part.status)}>
                              {part.status}
                            </button>
                          </td>
                          <td>
                            <span className="badge" style={{ backgroundColor: part.paymentStatus === 'completed' ? 'var(--success-light)' : 'var(--warning-light)', color: part.paymentStatus === 'completed' ? 'var(--success)' : 'var(--warning)' }}>
                              {part.paymentStatus}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.35rem' }}>
                              <button className="btn btn-outline" style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem' }} onClick={() => sendWhatsApp(part, 'welcome')}>
                                Welcome
                              </button>
                              <button className="btn btn-outline" style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem' }} onClick={() => sendWhatsApp(part, 'payment_reminder')}>
                                Reminder
                              </button>
                              {part.paymentStatus === 'completed' && (
                                <button className="btn btn-outline" style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', color: 'var(--success)', borderColor: 'var(--success)' }} onClick={() => sendWhatsApp(part, 'payment_verified')}>
                                  Receipt
                                </button>
                              )}
                            </div>
                          </td>
                          <td>
                            <button className="btn btn-danger btn-icon" onClick={() => db.deleteParticipant(part.id).then(() => setRefreshTrigger(prev => prev + 1))}>
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ======================================= */}
            {/* TAB: PAYMENTS */}
            {/* ======================================= */}
            {activeTab === 'payments' && (
              <div>
                <h3>Payment Verification Desk</h3>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Participant</th>
                        <th>Amount Uploaded</th>
                        <th>Transaction Ref</th>
                        <th>Date Paid</th>
                        <th>Proof Receipt</th>
                        <th>Verification Status</th>
                        <th>Quick Verification Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filterList(payments, ['transactionRef', 'amountPaid']).map(pay => {
                        const partObj = participants.find(p => p.id === pay.participantId) || { name: 'Unknown Devotee' };
                        return (
                          <tr key={pay.id}>
                            <td>
                              <strong>{partObj.name}</strong>
                              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ID: {pay.participantId}</p>
                            </td>
                            <td><strong style={{ fontSize: '1.05rem', color: 'var(--success)' }}>₹{pay.amountPaid}</strong></td>
                            <td><code>{pay.transactionRef}</code></td>
                            <td>{pay.paymentDate}</td>
                            <td>
                              {pay.screenshotUrl ? (
                                <a href={pay.screenshotUrl} target="_blank" rel="noopener noreferrer">
                                  <img src={pay.screenshotUrl} alt="Receipt proof" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border)' }} />
                                </a>
                              ) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No screenshot</span>
                              )}
                            </td>
                            <td>
                              <span className="badge" style={{ 
                                backgroundColor: pay.status === 'verified' ? 'var(--success-light)' : pay.status === 'rejected' ? 'var(--danger-light)' : 'var(--warning-light)',
                                color: pay.status === 'verified' ? 'var(--success)' : pay.status === 'rejected' ? 'var(--danger)' : 'var(--warning)'
                              }}>
                                {pay.status.replace('_', ' ')}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '0.35rem' }}>
                                <button className="btn btn-outline" style={{ padding: '0.35rem 0.5rem', color: 'var(--success)', borderColor: 'var(--success-border)', backgroundColor: 'var(--success-light)' }} onClick={() => verifyPayment(pay.id, pay.participantId, 'verified')}>
                                  <Check size={14} /> Verify
                                </button>
                                <button className="btn btn-outline" style={{ padding: '0.35rem 0.5rem', color: 'var(--danger)', borderColor: 'hsla(350,80%,55%,0.2)', backgroundColor: 'var(--danger-light)' }} onClick={() => verifyPayment(pay.id, pay.participantId, 'rejected')}>
                                  <X size={14} /> Reject
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ======================================= */}
            {/* TAB: EXPENSE SPLITTER */}
            {/* ======================================= */}
            {activeTab === 'expenses' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3>Yatra Expense Sheets & Auto Split</h3>
                  <button className="btn btn-primary" onClick={() => setIsAddExpenseOpen(true)}>
                    <Plus size={16} /> Add Expense
                  </button>
                </div>

                {/* EXPENSE SUMMARY BOXES */}
                <div className="grid-cols-4" style={{ marginBottom: '2rem' }}>
                  <div className="card stat-card" style={{ borderLeft: '4px solid var(--primary)' }}>
                    <div className="stat-info">
                      <h3>Total Expenses</h3>
                      <div className="value">₹{expCalc.totalExpenses.toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="card stat-card" style={{ borderLeft: '4px solid var(--success)' }}>
                    <div className="stat-info">
                      <h3>Amount Collected</h3>
                      <div className="value">₹{expCalc.totalCollected.toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="card stat-card" style={{ borderLeft: '4px solid var(--info)' }}>
                    <div className="stat-info">
                      <h3>Cost Per Person</h3>
                      <div className="value">₹{Math.round(expCalc.amountPerPerson).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="card stat-card" style={{ borderLeft: '4px solid var(--danger)' }}>
                    <div className="stat-info">
                      <h3>Remaining Deficit</h3>
                      <div className="value">₹{(expCalc.totalExpenses - expCalc.totalCollected).toLocaleString()}</div>
                    </div>
                  </div>
                </div>

                {/* LIST OF EXPENSES */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
                  <div>
                    <h4>Expenses Ledger</h4>
                    <div className="table-container">
                      <table>
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Category</th>
                            <th>Amount</th>
                            <th>Paid By</th>
                            <th>Applies To</th>
                            <th>Remarks</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filterList(expenses, ['remarks', 'paidBy', 'category']).map(exp => (
                            <tr key={exp.id}>
                              <td>{exp.date}</td>
                              <td><span className="badge" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>{exp.category}</span></td>
                              <td><strong>₹{exp.amount}</strong></td>
                              <td>{exp.paidBy}</td>
                              <td><span style={{ textTransform: 'capitalize' }}>{exp.appliesTo}</span></td>
                              <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{exp.remarks}</td>
                              <td>
                                <button className="btn btn-danger btn-icon" onClick={() => db.deleteExpense(exp.id).then(() => setRefreshTrigger(prev => prev + 1))}>
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* SPLIT BALANCES */}
                  <div>
                    <h4>Participant Balances</h4>
                    <div className="table-container">
                      <table>
                        <thead>
                          <tr>
                            <th>Devotee Name</th>
                            <th>Members</th>
                            <th>Share Cost</th>
                            <th>Paid</th>
                            <th>Balance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {expCalc.splits.map(split => (
                            <tr key={split.id}>
                              <td><strong>{split.name}</strong></td>
                              <td>{split.headCount}</td>
                              <td>₹{Math.round(split.share)}</td>
                              <td style={{ color: 'var(--success)' }}>₹{split.paid}</td>
                              <td style={{ color: split.balance > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: '600' }}>
                                {split.balance > 0 ? `₹${Math.round(split.balance)}` : 'Settle'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ======================================= */}
            {/* TAB: PHOTOS */}
            {/* ======================================= */}
            {activeTab === 'photos' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3>Shared Yatra Photos</h3>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-outline" onClick={downloadAllPhotos}>
                      <Download size={16} /> Download All as ZIP
                    </button>
                    <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
                      <Upload size={16} /> Upload Photo
                      <input 
                        type="file" 
                        accept="image/*" 
                        style={{ display: 'none' }} 
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleImageUpload(e.target.files[0], async (base64) => {
                              await db.addPhoto({
                                yatraId: selectedYatra.id,
                                uploader: currentUser.name,
                                date: new Date().toISOString().split('T')[0],
                                caption: 'Uploaded by Admin',
                                imageUrl: base64
                              });
                              setRefreshTrigger(prev => prev + 1);
                            });
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                  {photos.map(photo => (
                    <div key={photo.id} className="card" style={{ padding: '0.5rem', display: 'flex', flexDirection: 'column' }}>
                      <img src={photo.imageUrl} alt="Uploaded" style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />
                      <div style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
                        <strong>{photo.uploader}</strong>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{photo.date}</p>
                        {photo.caption && <p style={{ fontStyle: 'italic', marginTop: '0.25rem' }}>"{photo.caption}"</p>}
                      </div>
                      <button className="btn btn-danger btn-icon" style={{ alignSelf: 'flex-end', marginTop: 'auto', padding: '0.25rem' }} onClick={() => db.deletePhoto(photo.id).then(() => setRefreshTrigger(prev => prev + 1))}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ======================================= */}
            {/* TAB: NOTES & CHECKLIST */}
            {/* ======================================= */}
            {activeTab === 'notes' && notes && (
              <div className="grid-cols-2">
                {/* GENERAL NOTES */}
                <div className="card">
                  <h3>General Notes & Reference Book</h3>
                  <textarea 
                    className="form-control" 
                    rows={12} 
                    style={{ marginTop: '1rem', fontFamily: 'monospace' }} 
                    placeholder="Enter Temple timings, local driver contacts, pandit details here..."
                    value={JSON.parse(notes.content).general}
                    onChange={async (e) => {
                      const current = JSON.parse(notes.content);
                      current.general = e.target.value;
                      const updatedNotes = await db.updateNotes(notes.id, { content: JSON.stringify(current) });
                      setNotes(updatedNotes);
                    }}
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Auto-saved instantly as you type.</p>
                </div>

                {/* CHECKLIST */}
                <div className="card">
                  <h3>Yatra Organizer Checklist</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                    {JSON.parse(notes.content).checklist.map(item => (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                        <label className="checkbox-group">
                          <input 
                            type="checkbox" 
                            checked={item.checked} 
                            onChange={async (e) => {
                              const current = JSON.parse(notes.content);
                              const match = current.checklist.find(i => i.id === item.id);
                              if (match) match.checked = e.target.checked;
                              const updatedNotes = await db.updateNotes(notes.id, { content: JSON.stringify(current) });
                              setNotes(updatedNotes);
                            }}
                          />
                          <span style={{ textDecoration: item.checked ? 'line-through' : '', color: item.checked ? 'var(--text-muted)' : '' }}>{item.text}</span>
                        </label>
                        <button className="btn btn-danger btn-icon" style={{ padding: '0.25rem' }} onClick={async () => {
                          const current = JSON.parse(notes.content);
                          current.checklist = current.checklist.filter(i => i.id !== item.id);
                          const updatedNotes = await db.updateNotes(notes.id, { content: JSON.stringify(current) });
                          setNotes(updatedNotes);
                        }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Add new task..." 
                        id="new-task-input"
                        onKeyDown={async (e) => {
                          if (e.key === 'Enter' && e.target.value.trim()) {
                            const current = JSON.parse(notes.content);
                            current.checklist.push({
                              id: 'chk_' + Math.random().toString(36).substring(2, 9),
                              text: e.target.value.trim(),
                              checked: false
                            });
                            const updatedNotes = await db.updateNotes(notes.id, { content: JSON.stringify(current) });
                            setNotes(updatedNotes);
                            e.target.value = '';
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ======================================= */}
            {/* TAB: DOCUMENTS */}
            {/* ======================================= */}
            {activeTab === 'documents' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3>Document Vault</h3>
                  <button className="btn btn-primary" onClick={() => setIsUploadDocOpen(true)}>
                    <Plus size={16} /> Upload Document
                  </button>
                </div>

                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Document Name</th>
                        <th>Type</th>
                        <th>Upload Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map(docRec => (
                        <tr key={docRec.id}>
                          <td>
                            <strong>{docRec.name}</strong>
                          </td>
                          <td><span className="badge" style={{ backgroundColor: 'var(--bg)' }}>{docRec.type.toUpperCase()}</span></td>
                          <td>{docRec.uploadDate}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <a href={docRec.fileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-icon" download>
                                <Download size={14} />
                              </a>
                              <button className="btn btn-danger btn-icon" onClick={() => db.deleteDocumentRecord(docRec.id).then(() => setRefreshTrigger(prev => prev + 1))}>
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ======================================= */}
            {/* TAB: REPORTS */}
            {/* ======================================= */}
            {activeTab === 'reports' && (
              <div>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  <button className="btn btn-outline" onClick={() => exportToCSV(participants, `${selectedYatra.name}_Participants`)}>
                    <FileDown size={16} /> Export Participant CSV
                  </button>
                  <button className="btn btn-outline" onClick={() => exportToCSV(payments, `${selectedYatra.name}_Payments`)}>
                    <FileDown size={16} /> Export Payment CSV
                  </button>
                  <button className="btn btn-outline" onClick={() => window.print()}>
                    <FileText size={16} /> Print Yatra Booklet
                  </button>
                </div>

                <div id="printable-report" className="card" style={{ padding: '2rem' }}>
                  <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h2>YATRA FINANCIAL & DELEGATE SUMMARY REPORT</h2>
                    <h4>{selectedYatra.name} to {selectedYatra.destination}</h4>
                    <p style={{ color: 'var(--text-muted)' }}>Date Generated: {new Date().toLocaleDateString()}</p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2.5rem' }}>
                    <div>
                      <h4 style={{ borderBottom: '2px solid var(--border)', paddingBottom: '0.5rem' }}>Financial Overview</h4>
                      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.5rem' }}>
                        <tbody>
                          <tr>
                            <td style={{ padding: '0.5rem 0' }}>Total Expenses Incurred:</td>
                            <td style={{ textAlign: 'right', fontWeight: 'bold' }}>₹{expCalc.totalExpenses.toLocaleString()}</td>
                          </tr>
                          <tr>
                            <td style={{ padding: '0.5rem 0' }}>Total Amount Verified/Collected:</td>
                            <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--success)' }}>₹{expCalc.totalCollected.toLocaleString()}</td>
                          </tr>
                          <tr>
                            <td style={{ padding: '0.5rem 0' }}>Devotee Share Cost Per Person:</td>
                            <td style={{ textAlign: 'right', fontWeight: 'bold' }}>₹{Math.round(expCalc.amountPerPerson).toLocaleString()}</td>
                          </tr>
                          <tr style={{ borderTop: '1px solid var(--border)' }}>
                            <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>Balance Deficit:</td>
                            <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--danger)' }}>₹{(expCalc.totalExpenses - expCalc.totalCollected).toLocaleString()}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div>
                      <h4 style={{ borderBottom: '2px solid var(--border)', paddingBottom: '0.5rem' }}>Devotee Breakdown</h4>
                      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.5rem' }}>
                        <tbody>
                          <tr>
                            <td style={{ padding: '0.5rem 0' }}>Total Expected Seats:</td>
                            <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{selectedYatra.expectedParticipants}</td>
                          </tr>
                          <tr>
                            <td style={{ padding: '0.5rem 0' }}>Confirmed Devotees (Paid & Pending):</td>
                            <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{expCalc.confirmedCount}</td>
                          </tr>
                          <tr>
                            <td style={{ padding: '0.5rem 0' }}>Interested / Enquiries:</td>
                            <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{participants.filter(p => p.status === 'interested').length}</td>
                          </tr>
                          <tr>
                            <td style={{ padding: '0.5rem 0' }}>Waiting List Count:</td>
                            <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{participants.filter(p => p.status === 'waiting').length}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================= */}
        {/* VIEW 4: PUBLIC PARTICIPANT REGISTRATION */}
        {/* ======================================= */}
        {currentRoute.path === 'register' && selectedYatra && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
            <div className="card" style={{ width: '100%', maxWidth: '600px', padding: '2.5rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <Compass size={40} style={{ color: 'var(--primary)', marginBottom: '0.5rem' }} />
                <h2>Spiritual Devotee Registration Form</h2>
                <h4>Join us for {selectedYatra.name}</h4>
                <p style={{ color: 'var(--text-muted)' }}>📍 Destination: {selectedYatra.destination}</p>
                <p style={{ color: 'var(--text-muted)' }}>📅 Dates: {selectedYatra.startDate} to {selectedYatra.endDate}</p>
              </div>

              {selectedYatra.registrationDeadline && new Date() > new Date(selectedYatra.registrationDeadline) ? (
                <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                  <div style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)', width: '3.5rem', height: '3.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                    <AlertTriangle size={28} />
                  </div>
                  <h3>Registration Closed</h3>
                  <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>The registration link for this Yatra expired on <strong>{selectedYatra.registrationDeadline}</strong>.</p>
                  <p style={{ color: 'var(--text-muted)' }}>Please contact the organizer if you still wish to participate.</p>
                </div>
              ) : publicRegStatus === 'success' ? (
                <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                  <div style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)', width: '3.5rem', height: '3.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justify: 'center', margin: '0 auto 1.5rem', justifyContent: 'center' }}>
                    <Check size={28} />
                  </div>
                  <h3>Registration Successful!</h3>
                  <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', marginBottom: '2rem' }}>Your registration is received. Please proceed to payment to confirm your seats.</p>
                  <button className="btn btn-primary" onClick={() => navigateTo('payment', publicRegId)}>
                    Proceed to Payment
                  </button>
                </div>
              ) : (
                <form onSubmit={handlePublicRegister}>
                  <div className="grid-cols-2">
                    <div className="form-group">
                      <label>Devotee Name</label>
                      <input type="text" required className="form-control" placeholder="Ramesh Sharma" value={newParticipant.name} onChange={(e) => setNewParticipant({...newParticipant, name: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label>Mobile Number (WhatsApp Preferred)</label>
                      <input type="tel" required className="form-control" placeholder="9876543210" value={newParticipant.phone} onChange={(e) => setNewParticipant({...newParticipant, phone: e.target.value})} />
                    </div>
                  </div>

                  <div className="grid-cols-2">
                    <div className="form-group">
                      <label>Email Address</label>
                      <input type="email" required className="form-control" placeholder="ramesh@gmail.com" value={newParticipant.email} onChange={(e) => setNewParticipant({...newParticipant, email: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label>City</label>
                      <input type="text" required className="form-control" placeholder="Mumbai" value={newParticipant.city} onChange={(e) => setNewParticipant({...newParticipant, city: e.target.value})} />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Registration Type</label>
                    <select value={newParticipant.type} onChange={(e) => setNewParticipant({...newParticipant, type: e.target.value})}>
                      <option value="individual">Individual Traveller</option>
                      <option value="family">Family Group</option>
                    </select>
                  </div>

                  {newParticipant.type === 'family' && (
                    <div style={{ backgroundColor: 'var(--bg)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem' }}>
                      <div className="form-group">
                        <label>Family Name / Title</label>
                        <input type="text" className="form-control" placeholder="Sharma Family" value={newParticipant.familyName} onChange={(e) => setNewParticipant({...newParticipant, familyName: e.target.value})} />
                      </div>
                      <div className="form-group">
                        <label>Total Family Members</label>
                        <input type="number" className="form-control" min={1} value={newParticipant.membersCount} onChange={(e) => setNewParticipant({...newParticipant, membersCount: parseInt(e.target.value) || 1})} />
                      </div>
                      <div className="form-group">
                        <label>Members Details (Names, Ages, Relations)</label>
                        <textarea className="form-control" rows={3} placeholder="1. Ramesh (45) - Self, 2. Sunita (42) - Wife..." value={newParticipant.memberDetails} onChange={(e) => setNewParticipant({...newParticipant, memberDetails: e.target.value})} />
                      </div>
                    </div>
                  )}

                  <div className="form-group">
                    <label>Special Dietary Requirements (e.g. Sattvic, No onion/garlic, Diabetic diet)</label>
                    <input type="text" className="form-control" placeholder="Pure sattvic, no garlic" value={newParticipant.specialRequirements} onChange={(e) => setNewParticipant({...newParticipant, specialRequirements: e.target.value})} />
                  </div>

                  <div className="form-group">
                    <label>Medical Notes or History</label>
                    <input type="text" className="form-control" placeholder="Elderly member cannot walk long distances" value={newParticipant.medicalNotes} onChange={(e) => setNewParticipant({...newParticipant, medicalNotes: e.target.value})} />
                  </div>

                  <div className="form-group">
                    <label>Remarks / Notes</label>
                    <textarea className="form-control" rows={2} placeholder="Any other details you want us to know..." value={newParticipant.remarks} onChange={(e) => setNewParticipant({...newParticipant, remarks: e.target.value})} />
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', padding: '0.75rem' }}>
                    Register & Continue to Payment
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* ======================================= */}
        {/* VIEW 5: PUBLIC UPI QR PAYMENT */}
        {/* ======================================= */}
        {currentRoute.path === 'payment' && selectedYatra && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
            <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '2.5rem', textAlign: 'center' }}>
              <Compass size={40} style={{ color: 'var(--primary)', marginBottom: '0.5rem', display: 'inline-block' }} />
              <h2>UPI QR Scan to Pay</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Complete your yatra fees payment to confirm booking</p>

              {publicPayStatus === 'success' ? (
                <div style={{ padding: '1.5rem 0' }}>
                  <div style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)', width: '3.5rem', height: '3.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                    <Check size={28} />
                  </div>
                  <h3>Receipt Submitted Successfully!</h3>
                  <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>The organizer has received your receipt. We will verify the transaction and notify you shortly on WhatsApp.</p>
                  <button className="btn btn-outline" style={{ marginTop: '1.5rem' }} onClick={() => navigateTo('login')}>
                    Go to Portal Login
                  </button>
                </div>
              ) : (
                <form onSubmit={handlePublicPayment}>
                  {/* UPI QR SCANNER BOX */}
                  <div style={{ backgroundColor: 'var(--bg)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px dashed var(--primary-border)', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <img 
                      src={getUPIQRCodeUrl(selectedYatra.upiId, selectedYatra.upiName, parseFloat(publicPayAmount) || 0, 'Yatra Payment')} 
                      alt="UPI QR Scanner" 
                      style={{ width: '200px', height: '200px', backgroundColor: 'white', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                    />
                    <div style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
                      <strong>UPI ID:</strong> <code>{selectedYatra.upiId}</code><br />
                      <strong>Account Name:</strong> {selectedYatra.upiName}
                    </div>
                  </div>

                  <div className="form-group" style={{ textAlign: 'left' }}>
                    <label>Amount Paid (₹)</label>
                    <input type="number" required className="form-control" placeholder="12000" value={publicPayAmount} onChange={(e) => setPublicPayAmount(e.target.value)} />
                  </div>

                  <div className="form-group" style={{ textAlign: 'left' }}>
                    <label>UPI Transaction / Reference Number (12 Digits)</label>
                    <input type="text" required className="form-control" placeholder="UPI1234901824..." value={publicPayRef} onChange={(e) => setPublicPayRef(e.target.value)} />
                  </div>

                  <div className="form-group" style={{ textAlign: 'left' }}>
                    <label>Payment Date</label>
                    <input type="date" required className="form-control" value={publicPayDate} onChange={(e) => setPublicPayDate(e.target.value)} />
                  </div>

                  <div className="form-group" style={{ textAlign: 'left' }}>
                    <label>Upload Screenshot / Receipt Proof</label>
                    <input type="file" required accept="image/*" className="form-control" onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleImageUpload(e.target.files[0], setPublicPayScreenshot);
                      }
                    }} />
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', padding: '0.75rem' }}>
                    Submit Payment Receipt
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* ======================================= */}
        {/* VIEW 6: DEVOTEE PORTAL / MY YATRA */}
        {/* ======================================= */}
        {currentRoute.path === 'my-yatra' && myParticipantData && selectedYatra && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '2rem' }}>
              <div>
                <h2>Hare Krishna, {myParticipantData.name}!</h2>
                <p style={{ color: 'var(--text-muted)' }}>Devotee Space for <strong>{selectedYatra.name}</strong></p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span className={`badge badge-${myParticipantData.status}`}>{myParticipantData.status}</span>
                <span className="badge" style={{ backgroundColor: myParticipantData.paymentStatus === 'completed' ? 'var(--success-light)' : 'var(--warning-light)', color: myParticipantData.paymentStatus === 'completed' ? 'var(--success)' : 'var(--warning)' }}>
                  Payment: {myParticipantData.paymentStatus}
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.25fr', gap: '2rem' }}>
              <div>
                {/* MY DETAILS & TRAVEL NOTES */}
                <div className="card" style={{ marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3>Yatra Schedule & General Reference</h3>
                    <button className="btn btn-outline" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} onClick={() => {
                      setEditProfileData({ ...myParticipantData });
                      setIsEditProfileOpen(true);
                    }}>
                      <Edit2 size={14} /> Update My Profile
                    </button>
                  </div>
                  {myNotes ? (
                    <div style={{ marginTop: '1rem', whiteSpace: 'pre-line', fontFamily: 'monospace', backgroundColor: 'var(--bg)', padding: '1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      {JSON.parse(myNotes.content).general || "No notes have been shared by the organizer yet."}
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>No schedule notes shared yet.</p>
                  )}
                </div>

                {/* MY SHARED PHOTOS */}
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3>Shared Yatra Photo Gallery</h3>
                    <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
                      <Upload size={16} /> Upload Photo
                      <input 
                        type="file" 
                        accept="image/*" 
                        style={{ display: 'none' }} 
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleImageUpload(e.target.files[0], async (base64) => {
                              await db.addPhoto({
                                yatraId: selectedYatra.id,
                                uploader: myParticipantData.name,
                                date: new Date().toISOString().split('T')[0],
                                caption: 'Shared by Devotee',
                                imageUrl: base64
                              });
                              // Reload photos
                              db.getPhotos(selectedYatra.id).then(setMyPhotos);
                            });
                          }
                        }}
                      />
                    </label>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
                    {myPhotos.map(photo => (
                      <div key={photo.id} style={{ display: 'flex', flexDirection: 'column', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                        <img src={photo.imageUrl} alt="Shared" style={{ width: '100%', height: '130px', objectFit: 'cover' }} />
                        <div style={{ padding: '0.5rem', fontSize: '0.75rem' }}>
                          <strong>{photo.uploader}</strong>
                          <p style={{ color: 'var(--text-muted)' }}>{photo.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* PAYMENTS PORTLET */}
              <div>
                <div className="card" style={{ textAlign: 'center' }}>
                  <h3>Booking Status & Payments</h3>
                  {myParticipantData.paymentStatus === 'completed' ? (
                    <div style={{ padding: '1rem 0' }}>
                      <div style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)', width: '3.5rem', height: '3.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                        <Check size={28} />
                      </div>
                      <h4 style={{ color: 'var(--success)' }}>Confirmed Booking</h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>We have successfully received and verified your payment.</p>
                    </div>
                  ) : (
                    <div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.5rem 0 1.25rem' }}>Your payment is currently pending verification. Scan the UPI QR code below, pay manually, and submit your receipt details.</p>
                      
                      <div style={{ backgroundColor: 'var(--bg)', padding: '1rem', borderRadius: 'var(--radius-sm)', display: 'inline-block', marginBottom: '1rem', border: '1px solid var(--border)' }}>
                        <img 
                          src={getUPIQRCodeUrl(selectedYatra.upiId, selectedYatra.upiName, 0, 'Confirm Yatra Seat')} 
                          alt="Pay UPI" 
                          style={{ width: '150px', height: '150px' }}
                        />
                      </div>
                      
                      <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => navigateTo('payment', myParticipantData.id)}>
                        Upload Payment Receipt
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 'auto', backgroundColor: 'var(--bg-header)' }}>
        <p>© 2026 Spiritual Yatra Management System | Designed for Devotee Tours</p>
      </footer>

      {/* ======================================================== */}
      {/* MODAL DIALOGS */}
      {/* ======================================================== */}

      {/* MODAL: CREATE YATRA */}
      {isEditProfileOpen && editProfileData && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Update Profile Details</h3>
              <button className="modal-close" onClick={() => setIsEditProfileOpen(false)}>×</button>
            </div>
            <form onSubmit={handleUpdateProfile}>
              <div className="grid-cols-2">
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" required className="form-control" value={editProfileData.name} onChange={(e) => setEditProfileData({...editProfileData, name: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input type="email" className="form-control" value={editProfileData.email} onChange={(e) => setEditProfileData({...editProfileData, email: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label>City</label>
                <input type="text" className="form-control" value={editProfileData.city} onChange={(e) => setEditProfileData({...editProfileData, city: e.target.value})} />
              </div>
              {editProfileData.type === 'family' && (
                <div className="form-group">
                  <label>Members Details (Names/Ages)</label>
                  <textarea className="form-control" rows={2} value={editProfileData.memberDetails} onChange={(e) => setEditProfileData({...editProfileData, memberDetails: e.target.value})} />
                </div>
              )}
              <div className="form-group">
                <label>Special Dietary Requirements</label>
                <input type="text" className="form-control" value={editProfileData.specialRequirements} onChange={(e) => setEditProfileData({...editProfileData, specialRequirements: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Medical Comments / Notes</label>
                <input type="text" className="form-control" value={editProfileData.medicalNotes} onChange={(e) => setEditProfileData({...editProfileData, medicalNotes: e.target.value})} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>Save Changes</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE YATRA */}
      {isCreateYatraOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Create New Spiritual Yatra</h3>
              <button className="modal-close" onClick={() => setIsCreateYatraOpen(false)}>×</button>
            </div>
            <form onSubmit={handleCreateYatra}>
              <div className="form-group">
                <label>Yatra Title / Name</label>
                <input type="text" required className="form-control" placeholder="Vrindavan Dham Yatra" value={newYatra.name} onChange={(e) => setNewYatra({...newYatra, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Destination Location</label>
                <input type="text" required className="form-control" placeholder="Vrindavan, Uttar Pradesh" value={newYatra.destination} onChange={(e) => setNewYatra({...newYatra, destination: e.target.value})} />
              </div>
              <div className="grid-cols-2">
                <div className="form-group">
                  <label>Start Date</label>
                  <input type="date" required className="form-control" value={newYatra.startDate} onChange={(e) => setNewYatra({...newYatra, startDate: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input type="date" required className="form-control" value={newYatra.endDate} onChange={(e) => setNewYatra({...newYatra, endDate: e.target.value})} />
                </div>
              </div>
              <div className="grid-cols-2">
                <div className="form-group">
                  <label>Expected Target Seats (Devotees)</label>
                  <input type="number" required className="form-control" min={1} value={newYatra.expectedParticipants} onChange={(e) => setNewYatra({...newYatra, expectedParticipants: parseInt(e.target.value) || 30})} />
                </div>
                <div className="form-group">
                  <label>Registration Link Expiry (Deadline)</label>
                  <input type="date" required className="form-control" value={newYatra.registrationDeadline} onChange={(e) => setNewYatra({...newYatra, registrationDeadline: e.target.value})} />
                </div>
              </div>
              <div className="grid-cols-2">
                <div className="form-group">
                  <label>Paytm/UPI ID for Devotees</label>
                  <input type="text" required className="form-control" placeholder="rohit.wadhwani83@okaxis" value={newYatra.upiId} onChange={(e) => setNewYatra({...newYatra, upiId: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>UPI Account Name</label>
                  <input type="text" required className="form-control" placeholder="Rohit Wadhwani" value={newYatra.upiName} onChange={(e) => setNewYatra({...newYatra, upiName: e.target.value})} />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>Create Yatra Tour</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD HOTEL */}
      {isAddHotelOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Record Hotel Evaluated</h3>
              <button className="modal-close" onClick={() => setIsAddHotelOpen(false)}>×</button>
            </div>
            <form onSubmit={handleAddHotel}>
              <div className="form-group">
                <label>Hotel Name</label>
                <input type="text" required className="form-control" placeholder="ISKCON Guesthouse" value={newHotel.name} onChange={(e) => setNewHotel({...newHotel, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Address Details</label>
                <input type="text" className="form-control" placeholder="Chhatikara Road, Vrindavan" value={newHotel.address} onChange={(e) => setNewHotel({...newHotel, address: e.target.value})} />
              </div>
              <div className="grid-cols-2">
                <div className="form-group">
                  <label>Google Maps Location Link</label>
                  <input type="url" className="form-control" placeholder="https://maps.google.com/..." value={newHotel.gmapsLink} onChange={(e) => setNewHotel({...newHotel, gmapsLink: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Booking.com Link</label>
                  <input type="url" className="form-control" placeholder="https://booking.com/..." value={newHotel.bookingLink} onChange={(e) => setNewHotel({...newHotel, bookingLink: e.target.value})} />
                </div>
              </div>
              <div className="grid-cols-2">
                <div className="form-group">
                  <label>Contact Person Name</label>
                  <input type="text" className="form-control" placeholder="Krishna Das" value={newHotel.contactPerson} onChange={(e) => setNewHotel({...newHotel, contactPerson: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input type="tel" className="form-control" placeholder="9812345678" value={newHotel.phone} onChange={(e) => setNewHotel({...newHotel, phone: e.target.value})} />
                </div>
              </div>
              <div className="grid-cols-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label>Rooms Available</label>
                  <input type="number" className="form-control" value={newHotel.roomsAvailable} onChange={(e) => setNewHotel({...newHotel, roomsAvailable: parseInt(e.target.value) || 0})} />
                </div>
                <div className="form-group">
                  <label>Room Price (₹)</label>
                  <input type="number" className="form-control" value={newHotel.roomPrice} onChange={(e) => setNewHotel({...newHotel, roomPrice: parseFloat(e.target.value) || 0})} />
                </div>
                <div className="form-group">
                  <label>Mattress Extra (₹)</label>
                  <input type="number" className="form-control" value={newHotel.extraMattressCost} onChange={(e) => setNewHotel({...newHotel, extraMattressCost: parseFloat(e.target.value) || 0})} />
                </div>
              </div>
              <div className="form-group">
                <label>Distance From Temple (e.g. 200m, 1.5km)</label>
                <input type="text" className="form-control" placeholder="150 meters" value={newHotel.distanceFromTemple} onChange={(e) => setNewHotel({...newHotel, distanceFromTemple: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Important Notes / Evaluation Comments</label>
                <textarea className="form-control" rows={3} placeholder="Pricing includes breakfast..." value={newHotel.notes} onChange={(e) => setNewHotel({...newHotel, notes: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Upload Quotation / Screenshot Quote</label>
                <input type="file" accept="image/*" className="form-control" onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleImageUpload(e.target.files[0], (base64) => setNewHotel({...newHotel, quoteImageUrl: base64}));
                  }
                }} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>Record Evaluation Details</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD PARTICIPANT */}
      {isAddParticipantOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Register Devotee Details</h3>
              <button className="modal-close" onClick={() => setIsAddParticipantOpen(false)}>×</button>
            </div>
            <form onSubmit={handleAddParticipant}>
              <div className="grid-cols-2">
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" required className="form-control" placeholder="Amit Gupta" value={newParticipant.name} onChange={(e) => setNewParticipant({...newParticipant, name: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Phone Number (WhatsApp)</label>
                  <input type="tel" required className="form-control" placeholder="9876543210" value={newParticipant.phone} onChange={(e) => setNewParticipant({...newParticipant, phone: e.target.value})} />
                </div>
              </div>
              <div className="grid-cols-2">
                <div className="form-group">
                  <label>Email Address</label>
                  <input type="email" className="form-control" placeholder="amit@gmail.com" value={newParticipant.email} onChange={(e) => setNewParticipant({...newParticipant, email: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>City</label>
                  <input type="text" className="form-control" placeholder="Pune" value={newParticipant.city} onChange={(e) => setNewParticipant({...newParticipant, city: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label>Traveller Type</label>
                <select value={newParticipant.type} onChange={(e) => setNewParticipant({...newParticipant, type: e.target.value})}>
                  <option value="individual">Individual traveller</option>
                  <option value="family">Family Group</option>
                </select>
              </div>

              {newParticipant.type === 'family' && (
                <div style={{ backgroundColor: 'var(--bg)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem' }}>
                  <div className="form-group">
                    <label>Family Name</label>
                    <input type="text" className="form-control" placeholder="Gupta Family" value={newParticipant.familyName} onChange={(e) => setNewParticipant({...newParticipant, familyName: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Total Family Members</label>
                    <input type="number" className="form-control" min={1} value={newParticipant.membersCount} onChange={(e) => setNewParticipant({...newParticipant, membersCount: parseInt(e.target.value) || 1})} />
                  </div>
                  <div className="form-group">
                    <label>Members Details (Names/Ages)</label>
                    <textarea className="form-control" rows={2} placeholder="Amit (40), Sunita (38)..." value={newParticipant.memberDetails} onChange={(e) => setNewParticipant({...newParticipant, memberDetails: e.target.value})} />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Special Dietary Requirements</label>
                <input type="text" className="form-control" placeholder="No Onion / Garlic prasadam" value={newParticipant.specialRequirements} onChange={(e) => setNewParticipant({...newParticipant, specialRequirements: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Medical Comments / Notes</label>
                <input type="text" className="form-control" placeholder="Diabetes patient" value={newParticipant.medicalNotes} onChange={(e) => setNewParticipant({...newParticipant, medicalNotes: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Remarks</label>
                <input type="text" className="form-control" value={newParticipant.remarks} onChange={(e) => setNewParticipant({...newParticipant, remarks: e.target.value})} />
              </div>
              <div className="grid-cols-2">
                <div className="form-group">
                  <label>Verification Status</label>
                  <select value={newParticipant.status} onChange={(e) => setNewParticipant({...newParticipant, status: e.target.value})}>
                    <option value="interested">Interested</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="waiting">Waiting List</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Initial Payment Status</label>
                  <select value={newParticipant.paymentStatus} onChange={(e) => setNewParticipant({...newParticipant, paymentStatus: e.target.value})}>
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>Register Devotee</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD EXPENSE */}
      {isAddExpenseOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Record Expense Paid</h3>
              <button className="modal-close" onClick={() => setIsAddExpenseOpen(false)}>×</button>
            </div>
            <form onSubmit={handleAddExpense}>
              <div className="grid-cols-2">
                <div className="form-group">
                  <label>Date</label>
                  <input type="date" required className="form-control" value={newExpense.date} onChange={(e) => setNewExpense({...newExpense, date: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select value={newExpense.category} onChange={(e) => setNewExpense({...newExpense, category: e.target.value})}>
                    <option value="hotel">Hotel Accommodation</option>
                    <option value="food">Food prasadam</option>
                    <option value="temple">Temple Donation</option>
                    <option value="transport">Transport Bus/Train</option>
                    <option value="shopping">Shopping</option>
                    <option value="emergency">Emergency medical</option>
                    <option value="miscellaneous">Miscellaneous</option>
                  </select>
                </div>
              </div>
              <div className="grid-cols-2">
                <div className="form-group">
                  <label>Amount (₹)</label>
                  <input type="number" required className="form-control" placeholder="5000" value={newExpense.amount} onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Paid By</label>
                  <input type="text" required className="form-control" placeholder="Rohit Wadhwani" value={newExpense.paidBy} onChange={(e) => setNewExpense({...newExpense, paidBy: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label>Applies To (Who splits this cost?)</label>
                <select value={newExpense.appliesTo} onChange={(e) => setNewExpense({...newExpense, appliesTo: e.target.value})}>
                  <option value="everyone">Everyone (All Confirmed Devotees)</option>
                  <option value="families">Selected Families only</option>
                  <option value="individuals">Selected Individuals only</option>
                </select>
              </div>

              {newExpense.appliesTo !== 'everyone' && (
                <div style={{ backgroundColor: 'var(--bg)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', maxHeight: '150px', overflowY: 'auto' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Select Target Devotees:</label>
                  {participants.filter(p => p.status === 'confirmed').map(p => (
                    <label key={p.id} className="checkbox-group" style={{ margin: '0.25rem 0' }}>
                      <input 
                        type="checkbox" 
                        checked={newExpense.targetIds.includes(p.id)} 
                        onChange={(e) => {
                          const list = [...newExpense.targetIds];
                          if (e.target.checked) {
                            list.push(p.id);
                          } else {
                            const index = list.indexOf(p.id);
                            if (index >= 0) list.splice(index, 1);
                          }
                          setNewExpense({...newExpense, targetIds: list});
                        }} 
                      />
                      <span>{p.name} {p.type === 'family' ? `(${p.familyName})` : ''}</span>
                    </label>
                  ))}
                </div>
              )}

              <div className="form-group">
                <label>Remarks / Details</label>
                <input type="text" className="form-control" placeholder="Paid for Prasadam plates at ISKCON" value={newExpense.remarks} onChange={(e) => setNewExpense({...newExpense, remarks: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Upload Bill Quote screenshot</label>
                <input type="file" accept="image/*" className="form-control" onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleImageUpload(e.target.files[0], (base64) => setNewExpense({...newExpense, billImageUrl: base64}));
                  }
                }} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>Record Expense Sheet</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: UPLOAD DOCUMENT */}
      {isUploadDocOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Upload Document File</h3>
              <button className="modal-close" onClick={() => setIsUploadDocOpen(false)}>×</button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              await db.addDocumentRecord({
                ...newDocument,
                yatraId: selectedYatra.id,
                uploadDate: new Date().toISOString().split('T')[0]
              });
              setIsUploadDocOpen(false);
              setNewDocument({ name: '', fileUrl: '', type: 'pdf' });
              setRefreshTrigger(prev => prev + 1);
            }}>
              <div className="form-group">
                <label>Document Name (e.g. Bus Booking Receipt)</label>
                <input type="text" required className="form-control" placeholder="Hotel Quotation Invoice" value={newDocument.name} onChange={(e) => setNewDocument({...newDocument, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label>File Type</label>
                <select value={newDocument.type} onChange={(e) => setNewDocument({...newDocument, type: e.target.value})}>
                  <option value="pdf">PDF Document</option>
                  <option value="docx">Word Document</option>
                  <option value="image">Image Receipt</option>
                  <option value="other">Other Attachment</option>
                </select>
              </div>
              <div className="form-group">
                <label>Upload File</label>
                <input type="file" required className="form-control" onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    const fileObj = e.target.files[0];
                    handleImageUpload(fileObj, (base64) => {
                      setNewDocument({...newDocument, fileUrl: base64});
                    });
                  }
                }} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>Upload to Vault</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SUPER ADMIN CONFIG SETTINGS */}
      {isSettingsOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Super Admin Settings</h3>
              <button className="modal-close" onClick={() => setIsSettingsOpen(false)}>×</button>
            </div>
            <form onSubmit={saveFirebaseSettings}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <strong>Firebase Firestore Settings</strong>
                <span className="badge" style={{ backgroundColor: isFirebaseConnected ? 'var(--success-light)' : 'var(--warning-light)', color: isFirebaseConnected ? 'var(--success)' : 'var(--warning)' }}>
                  {isFirebaseConnected ? 'CONNECTED' : 'LOCAL STORAGE FALLBACK'}
                </span>
              </div>
              
              <div className="form-group">
                <label>Paste Firebase Config JSON</label>
                <textarea 
                  className="form-control" 
                  rows={8} 
                  style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                  placeholder={`{\n  "apiKey": "AIzaSy...",\n  "authDomain": "...",\n  "projectId": "...",\n  "storageBucket": "...",\n  "messagingSenderId": "...",\n  "appId": "..."\n}`}
                  value={firebaseConfig}
                  onChange={(e) => setFirebaseConfig(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', marginBottom: '2rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Connect & Sync Database
                </button>
                {isFirebaseConnected && (
                  <button type="button" className="btn btn-danger" onClick={disconnectFirebase}>
                    Disconnect
                  </button>
                )}
              </div>
            </form>

            <hr style={{ margin: '2rem 0', borderColor: 'var(--border)' }} />

            <div style={{ marginBottom: '1rem' }}>
              <h3>Manage Admin Access</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Invite secondary administrators who can manage yatras, verify payments, and export reports.</p>
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              {systemUsers.filter(u => u.role === 'admin').map(user => (
                <div key={user.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: 'var(--bg)', borderRadius: 'var(--radius-sm)', marginBottom: '0.5rem', border: '1px solid var(--border)' }}>
                  <div>
                    <strong>{user.email}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Role: Admin</div>
                  </div>
                  <button className="btn btn-danger btn-icon" onClick={() => handleDeleteAdmin(user.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {systemUsers.filter(u => u.role === 'admin').length === 0 && (
                <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', backgroundColor: 'var(--bg)', borderRadius: 'var(--radius-sm)' }}>
                  No extra admins invited yet.
                </div>
              )}
            </div>

            <form onSubmit={handleAddAdmin}>
              <div className="form-group" style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <input type="email" required className="form-control" placeholder="Enter new admin email..." value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} style={{ flex: 1 }} />
                <button type="submit" className="btn btn-outline">Add Admin</button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
}
