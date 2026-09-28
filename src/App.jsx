import React, { useState, useEffect, useRef } from 'react';
import { 
  Compass, Hotel, Users, CheckCircle, CreditCard, Receipt, Image as ImageIcon, 
  FileText, BarChart2, MessageSquare, Plus, Trash2, Edit2, Search, Download, 
  Check, X, LogOut, ArrowLeft, Eye, RefreshCw, AlertTriangle, QrCode, 
  ClipboardList, Settings, Share2, Upload, FileDown, Phone, MapPin, ExternalLink,
  Sparkles, UserCheck, Lock, Clock, ArrowRight,
  Bus, Bed, Shuffle
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
  const [buses, setBuses] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [busAllocationApproved, setBusAllocationApproved] = useState(false);
  const [roomAllocationApproved, setRoomAllocationApproved] = useState(false);

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
  const [editingYatraId, setEditingYatraId] = useState(null);
  const [isAddHotelOpen, setIsAddHotelOpen] = useState(false);
  const [isAddParticipantOpen, setIsAddParticipantOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUploadDocOpen, setIsUploadDocOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isAddBusOpen, setIsAddBusOpen] = useState(false);
  const [editingBusId, setEditingBusId] = useState(null);
  const [newBus, setNewBus] = useState({ name: '', busNumber: '', route: '', capacity: 35, coordinatorName: '', coordinatorPhone: '', driverName: '', driverPhone: '', departureTime: '06:00 AM', boardingPoint: '', notes: '' });
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState(null);
  const [newRoom, setNewRoom] = useState({ roomNumber: '', roomType: 'Double Bed', capacity: 2, floor: 'Ground Floor', hotelName: '', extraMattressCost: 500, notes: '' });

  // Form states for adding items
  const defaultDeadline = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [newYatra, setNewYatra] = useState({ name: '', destination: '', startDate: '', endDate: '', expectedParticipants: 30, pricePerPerson: '', customQrImageUrl: '', upiId: 'rohit.wadhwani83@okaxis', upiName: 'Rohit Wadhwani', registrationDeadline: defaultDeadline });
  const [newHotel, setNewHotel] = useState({ name: '', address: '', gmapsLink: '', bookingLink: '', contactPerson: '', phone: '', roomsAvailable: 10, roomPrice: 2000, extraMattressCost: 500, distanceFromTemple: '', notes: '', contacted: false, shortlisted: false, finalSelected: false, quoteImageUrl: '' });
  const [newParticipant, setNewParticipant] = useState({ name: '', phone: '', email: '', location: '', type: 'individual', familyName: '', membersCount: 1, familyMembers: [], memberDetails: '', travelMode: 'organised', travelType: '', boardingStation: '', droppingStation: '', remarks: '', status: 'interested', paymentStatus: 'pending' });
  const [newExpense, setNewExpense] = useState({ date: new Date().toISOString().split('T')[0], category: 'hotel', amount: '', paidBy: '', remarks: '', appliesTo: 'everyone', targetIds: [], billImageUrl: '' });
  const [newDocument, setNewDocument] = useState({ name: '', fileUrl: '', type: 'pdf' });
  
  // Public registration form states
  const [publicRegStatus, setPublicRegStatus] = useState(null); // 'success' | null
  const [publicRegId, setPublicRegId] = useState('');
  
  // Public payment page states
  const [publicPayAmount, setPublicPayAmount] = useState('');
  const [publicPayMethod, setPublicPayMethod] = useState('upi');
  const [publicPayRef, setPublicPayRef] = useState('');
  const [publicPayDate, setPublicPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [publicPayScreenshot, setPublicPayScreenshot] = useState('');
  const [publicPayStatus, setPublicPayStatus] = useState(null); // 'success' | null
  const [paymentParticipant, setPaymentParticipant] = useState(null);
  const [familyConfirmed, setFamilyConfirmed] = useState(false);

  // Participant Portal lookup state
  const [myParticipantData, setMyParticipantData] = useState(null);
  const [editProfileData, setEditProfileData] = useState(null);
  const [myPhotos, setMyPhotos] = useState([]);
  const [myNotes, setMyNotes] = useState(null);

  // New Task Form state (for upgraded To-Do Checklist)
  const [newTaskForm, setNewTaskForm] = useState({ text: '', details: '', date: '' });
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);

  // Participants Tab Enhanced UI States
  const [participantViewMode, setParticipantViewMode] = useState('table'); // 'table' | 'cards'
  const [participantFilter, setParticipantFilter] = useState('all'); // 'all' | 'confirmed' | 'interested' | 'partially_paid' | 'completed'
  const [expandedParticipantId, setExpandedParticipantId] = useState(null);

  // Devotee Profile Auto-fill States
  const [autoFilledDevotee, setAutoFilledDevotee] = useState(null);
  const [adminAutoFilledDevotee, setAdminAutoFilledDevotee] = useState(null);
  const [isSearchingPhone, setIsSearchingPhone] = useState(false);

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
      let yData = await db.getYatras();
      if (currentUser?.role !== 'super_admin') {
        yData = yData.filter(y => !y.isDeleted);
      }
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
        const bData = await db.getBuses(selectedYatra.id);
        const rData = await db.getRooms(selectedYatra.id);

        setHotels(hData);
        setParticipants(pData);
        setPayments(payData);
        setExpenses(eData);
        setPhotos(phData);
        setNotes(nData);
        setDocuments(dData);
        setBuses(bData);
        setRooms(rData);
      }
    }
    loadData();
  }, [selectedYatra, refreshTrigger, isFirebaseConnected, currentUser]);

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
        Promise.all([db.getCollection('participants'), db.getYatras()]).then(([allParts, allYatras]) => {
          const foundPart = allParts.find(p => p.id === id);
          if (foundPart) {
            setPaymentParticipant(foundPart);
            const foundYatra = allYatras.find(y => y.id === foundPart.yatraId);
            if (foundYatra) {
              setSelectedYatra(foundYatra);
              db.getPayments(foundPart.yatraId).then(allPays => {
                const verifiedPaid = allPays
                  .filter(pay => pay.participantId === foundPart.id && pay.status === 'verified')
                  .reduce((sum, pay) => sum + pay.amountPaid, 0);
                
                let total = 0;
                if (foundPart.customPrice && parseFloat(foundPart.customPrice) > 0) {
                  total = parseFloat(foundPart.customPrice);
                } else if (foundYatra.pricePerPerson) {
                  let billable = 1;
                  if (foundPart.type === 'family') {
                    if (foundPart.familyMembers && Array.isArray(foundPart.familyMembers) && foundPart.familyMembers.length > 0) {
                      billable = foundPart.familyMembers.filter(m => !m.age || parseInt(m.age) >= 5).length || 1;
                    } else {
                      billable = foundPart.membersCount || 1;
                    }
                  }
                  total = billable * parseFloat(foundYatra.pricePerPerson);
                }
                const due = Math.max(0, total - verifiedPaid);
                if (due > 0) {
                  setPublicPayAmount(due.toString());
                }
              });
            }
          } else {
            const found = allYatras.find(y => y.id === id);
            if (found) setSelectedYatra(found);
          }
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
    if (editingYatraId) {
      await db.updateYatra(editingYatraId, newYatra);
      setEditingYatraId(null);
    } else {
      const id = 'yatra_' + Math.random().toString(36).substring(2, 9);
      await db.addYatra({ ...newYatra, id, status: 'planning', isDeleted: false });
    }
    setIsCreateYatraOpen(false);
    setNewYatra({ name: '', destination: '', startDate: '', endDate: '', expectedParticipants: 30, pricePerPerson: '', customQrImageUrl: '', upiId: 'rohit.wadhwani83@okaxis', upiName: 'Rohit Wadhwani', registrationDeadline: defaultDeadline });
    setRefreshTrigger(prev => prev + 1);
  };

  const handleDeleteYatra = async (yatraId) => {
    if (window.confirm("Are you sure you want to delete this Yatra? It will be archived.")) {
      await db.softDeleteYatra(yatraId);
      if (selectedYatra?.id === yatraId) {
        setSelectedYatra(null);
        navigateTo('dashboard');
      }
      setRefreshTrigger(prev => prev + 1);
    }
  };

  const handleRestoreYatra = async (yatraId) => {
    if (window.confirm("Restore this Yatra to active status?")) {
      await db.restoreYatra(yatraId);
      setRefreshTrigger(prev => prev + 1);
    }
  };

  const handleAddHotel = async (e) => {
    e.preventDefault();
    await db.addHotel({ ...newHotel, yatraId: selectedYatra.id });
    setIsAddHotelOpen(false);
    setNewHotel({ name: '', address: '', gmapsLink: '', bookingLink: '', contactPerson: '', phone: '', roomsAvailable: 10, roomPrice: 2000, extraMattressCost: 500, distanceFromTemple: '', notes: '', contacted: false, shortlisted: false, finalSelected: false, quoteImageUrl: '' });
    setRefreshTrigger(prev => prev + 1);
  };

  // Devotee profile auto-fill helper (finds existing devotees across Yatras by 10-digit mobile number)
  const handleDevoteePhoneChange = async (enteredPhone, isAdmin = false) => {
    setNewParticipant(prev => ({ ...prev, phone: enteredPhone }));
    
    const clean = enteredPhone.replace(/[^0-9]/g, '').slice(-10);
    if (clean.length === 10) {
      setIsSearchingPhone(true);
      try {
        const found = await db.findDevoteeByPhone(clean);
        if (found) {
          if (isAdmin) {
            setAdminAutoFilledDevotee(found);
          } else {
            setAutoFilledDevotee(found);
          }
          setNewParticipant(prev => ({
            ...prev,
            phone: enteredPhone,
            name: found.name || prev.name,
            email: found.email || prev.email,
            location: found.location || prev.location,
            type: found.type || prev.type,
            familyName: found.familyName || prev.familyName,
            membersCount: found.membersCount || (found.familyMembers?.length || 1),
            familyMembers: (found.familyMembers && found.familyMembers.length > 0) ? found.familyMembers : prev.familyMembers,
            travelMode: found.travelMode || prev.travelMode,
            travelType: found.travelType || prev.travelType,
            boardingStation: found.boardingStation || prev.boardingStation,
            droppingStation: found.droppingStation || prev.droppingStation,
            remarks: prev.remarks || found.remarks || ''
          }));
        } else {
          if (isAdmin) setAdminAutoFilledDevotee(null);
          else setAutoFilledDevotee(null);
        }
      } catch (err) {
        console.error("Error looking up devotee:", err);
      } finally {
        setIsSearchingPhone(false);
      }
    } else {
      if (isAdmin) setAdminAutoFilledDevotee(null);
      else setAutoFilledDevotee(null);
    }
  };

  const handleAddParticipant = async (e) => {
    e.preventDefault();
    if (newParticipant.type === 'family' && (!newParticipant.familyMembers || newParticipant.familyMembers.length === 0)) {
      alert("Please add at least one family member (including the primary devotee) before registering.");
      return;
    }
    const partToSave = { ...newParticipant, yatraId: selectedYatra.id };
    await db.addParticipant(partToSave);
    await db.saveDevoteeProfile(newParticipant);
    setIsAddParticipantOpen(false);
    setAdminAutoFilledDevotee(null);
    setNewParticipant({ name: '', phone: '', email: '', location: '', type: 'individual', familyName: '', membersCount: 1, familyMembers: [], memberDetails: '', travelMode: 'organised', travelType: '', boardingStation: '', droppingStation: '', remarks: '', status: 'interested', paymentStatus: 'pending' });
    setRefreshTrigger(prev => prev + 1);
  };

  // --- Bus Logistics Handlers ---
  const handleAddBus = async (e) => {
    e.preventDefault();
    if (editingBusId) {
      await db.updateBus(editingBusId, newBus);
    } else {
      const id = 'bus_' + Math.random().toString(36).substring(2, 9);
      await db.addBus({ ...newBus, id, yatraId: selectedYatra.id });
    }
    setIsAddBusOpen(false);
    setEditingBusId(null);
    setNewBus({ name: '', busNumber: '', route: '', capacity: 35, coordinatorName: '', coordinatorPhone: '', driverName: '', driverPhone: '', departureTime: '06:00 AM', boardingPoint: '', notes: '' });
    setRefreshTrigger(prev => prev + 1);
  };

  const handleDeleteBus = async (busId) => {
    if (window.confirm("Delete this bus? Devotees assigned to this bus will become unallocated.")) {
      await db.deleteBus(busId);
      const affected = participants.filter(p => p.busId === busId);
      for (const p of affected) {
        await db.updateParticipant(p.id, { busId: '', busName: '', busNumber: '' });
      }
      setRefreshTrigger(prev => prev + 1);
    }
  };

  const handleReassignBus = async (participantId, busId) => {
    if (!busId) {
      await db.updateParticipant(participantId, { busId: '', busName: '', busNumber: '' });
    } else {
      const bus = buses.find(b => b.id === busId);
      if (bus) {
        await db.updateParticipant(participantId, {
          busId: bus.id,
          busName: bus.name,
          busNumber: bus.busNumber
        });
      }
    }
    setRefreshTrigger(prev => prev + 1);
  };

  const autoAllocateBuses = async () => {
    if (!buses || buses.length === 0) {
      alert("Please add at least one bus with seating capacity before running auto-allocation.");
      return;
    }

    const organisedDevotees = participants.filter(p => p.travelMode === 'organised');
    if (organisedDevotees.length === 0) {
      alert("No devotees found with 'Organised' travel mode. Auto-allocation only applies to devotees using organizer transport.");
      return;
    }

    // Sort by group size descending (larger families first for optimal bin-packing)
    const sorted = [...organisedDevotees].sort((a, b) => {
      const aCount = (a.familyMembers && a.familyMembers.length) || a.membersCount || 1;
      const bCount = (b.familyMembers && b.familyMembers.length) || b.membersCount || 1;
      return bCount - aCount;
    });

    const tracker = buses.map(b => ({
      ...b,
      remaining: parseInt(b.capacity) || 35,
      allocated: []
    }));

    const updates = [];
    let unallocatedCount = 0;

    for (const devotee of sorted) {
      const devoteePax = (devotee.familyMembers && devotee.familyMembers.length) || devotee.membersCount || 1;
      
      // Best fit: find a bus that has enough remaining capacity
      const suitable = tracker
        .filter(b => b.remaining >= devoteePax)
        .sort((a, b) => a.remaining - b.remaining);

      if (suitable.length > 0) {
        const chosen = suitable[0];
        chosen.remaining -= devoteePax;
        chosen.allocated.push(devotee);
        updates.push({
          id: devotee.id,
          busId: chosen.id,
          busName: chosen.name,
          busNumber: chosen.busNumber
        });
      } else {
        // Find bus with most space
        const largest = [...tracker].sort((a, b) => b.remaining - a.remaining)[0];
        if (largest && largest.remaining > 0) {
          largest.remaining -= devoteePax;
          largest.allocated.push(devotee);
          updates.push({
            id: devotee.id,
            busId: largest.id,
            busName: largest.name,
            busNumber: largest.busNumber
          });
        } else {
          unallocatedCount++;
          updates.push({
            id: devotee.id,
            busId: '',
            busName: '',
            busNumber: ''
          });
        }
      }
    }

    for (const u of updates) {
      await db.updateParticipant(u.id, {
        busId: u.busId,
        busName: u.busName,
        busNumber: u.busNumber
      });
    }

    setBusAllocationApproved(false);
    setRefreshTrigger(prev => prev + 1);

    if (unallocatedCount > 0) {
      alert(`Auto-allocation complete! ${updates.length - unallocatedCount} devotees placed. Notice: ${unallocatedCount} devotees could not fit within the current total bus capacity. Please add another bus or increase capacity.`);
    } else {
      alert(`🎉 Auto-allocation successful! All ${sorted.length} devotee groups have been placed into ${buses.length} buses keeping all family members intact! Review assignments below and click 'Approve & Publish' when ready.`);
    }
  };

  const sendBusWhatsApp = (participant, bus) => {
    if (!participant || !participant.phone || !bus) return;
    const phone = participant.phone.replace(/[^0-9]/g, '');
    const cleanPhone = phone.startsWith('91') && phone.length === 12 ? phone : (phone.length === 10 ? '91' + phone : phone);
    const totalPax = (participant.familyMembers && participant.familyMembers.length) || participant.membersCount || 1;
    const memberNames = participant.familyMembers && participant.familyMembers.length > 0 
      ? participant.familyMembers.map(m => m.name).join(', ') 
      : participant.name;

    const text = `🚌 *Hare Krishna ${participant.name}!* \n\nHere are your official *Bus Travel Details* for *${selectedYatra.name}*:\n\n*Bus Allocated:* ${bus.name}\n*Vehicle Reg. No:* ${bus.busNumber || 'To be shared'}\n*Route:* ${bus.route || selectedYatra.destination}\n*Boarding Point:* ${bus.boardingPoint || 'Main Gathering Gate'}\n*Departure Time:* ${bus.departureTime || '06:00 AM'}\n*Reserved Seats:* ${totalPax} Seat(s) (${memberNames})\n\n👤 *Bus Coordinator:* ${bus.coordinatorName || 'Organizer'} (${bus.coordinatorPhone || ''})\n👨‍✈️ *Driver:* ${bus.driverName || 'Driver'} (${bus.driverPhone || ''})\n\n${bus.notes ? `*Important Note:* ${bus.notes}\n\n` : ''}You can also view this bus pass anytime on your devotee portal:\n👉 ${window.location.href.split('#')[0]}#/login\n\nHaribol! Have a divine and comfortable journey! 🙏`;

    window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`, '_blank');
  };

  // --- Hotel Room Logistics Handlers ---
  const handleAddRoom = async (e) => {
    e.preventDefault();
    const finalSelectedHotel = hotels.find(h => h.finalSelected);
    const hotelName = newRoom.hotelName || (finalSelectedHotel ? finalSelectedHotel.name : (hotels[0]?.name || 'Primary Hotel'));
    if (editingRoomId) {
      await db.updateRoom(editingRoomId, { ...newRoom, hotelName });
    } else {
      const id = 'rm_' + Math.random().toString(36).substring(2, 9);
      await db.addRoom({ ...newRoom, id, yatraId: selectedYatra.id, hotelName });
    }
    setIsAddRoomOpen(false);
    setEditingRoomId(null);
    setNewRoom({ roomNumber: '', roomType: 'Double Bed', capacity: 2, floor: 'Ground Floor', hotelName: '', extraMattressCost: 500, notes: '' });
    setRefreshTrigger(prev => prev + 1);
  };

  const handleDeleteRoom = async (roomId) => {
    if (window.confirm("Delete this room? Devotees assigned to this room will become unallocated.")) {
      await db.deleteRoom(roomId);
      const affected = participants.filter(p => p.roomId === roomId);
      for (const p of affected) {
        await db.updateParticipant(p.id, { roomId: '', roomNumber: '', hotelName: '' });
      }
      setRefreshTrigger(prev => prev + 1);
    }
  };

  const handleReassignRoom = async (participantId, roomId) => {
    if (!roomId) {
      await db.updateParticipant(participantId, { roomId: '', roomNumber: '', hotelName: '' });
    } else {
      const rm = rooms.find(r => r.id === roomId);
      if (rm) {
        await db.updateParticipant(participantId, {
          roomId: rm.id,
          roomNumber: rm.roomNumber,
          hotelName: rm.hotelName
        });
      }
    }
    setRefreshTrigger(prev => prev + 1);
  };

  const autoAllocateRooms = async () => {
    if (!rooms || rooms.length === 0) {
      alert("Please add room inventory for the hotel before running auto-allocation.");
      return;
    }

    const devotees = participants.filter(p => p.status === 'confirmed' || p.status === 'interested');
    if (devotees.length === 0) {
      alert("No participants found to allocate rooms for.");
      return;
    }

    const roomTracker = rooms.map(r => ({
      ...r,
      baseCapacity: parseInt(r.capacity) || 2,
      remaining: parseInt(r.capacity) || 2,
      allocated: []
    }));

    const families = devotees.filter(p => p.type === 'family');
    const individuals = devotees.filter(p => p.type !== 'family');
    const updates = [];
    let unallocatedCount = 0;

    // 1. Allocate Families first into dedicated rooms
    for (const fam of families) {
      const famSize = (fam.familyMembers && fam.familyMembers.length) || fam.membersCount || 1;
      
      const emptyRooms = roomTracker
        .filter(r => r.allocated.length === 0)
        .sort((a, b) => Math.abs(a.baseCapacity - famSize) - Math.abs(b.baseCapacity - famSize));

      if (emptyRooms.length > 0) {
        const chosen = emptyRooms[0];
        chosen.remaining -= famSize;
        chosen.allocated.push(fam);
        updates.push({
          id: fam.id,
          roomId: chosen.id,
          roomNumber: chosen.roomNumber,
          hotelName: chosen.hotelName
        });
      } else {
        const anyRoom = roomTracker.find(r => r.remaining >= famSize);
        if (anyRoom) {
          anyRoom.remaining -= famSize;
          anyRoom.allocated.push(fam);
          updates.push({
            id: fam.id,
            roomId: anyRoom.id,
            roomNumber: anyRoom.roomNumber,
            hotelName: anyRoom.hotelName
          });
        } else {
          unallocatedCount++;
          updates.push({
            id: fam.id,
            roomId: '',
            roomNumber: '',
            hotelName: ''
          });
        }
      }
    }

    // 2. Allocate Individuals into remaining rooms
    for (const ind of individuals) {
      const suitable = roomTracker.find(r => r.remaining > 0);
      if (suitable) {
        suitable.remaining -= 1;
        suitable.allocated.push(ind);
        updates.push({
          id: ind.id,
          roomId: suitable.id,
          roomNumber: suitable.roomNumber,
          hotelName: suitable.hotelName
        });
      } else {
        unallocatedCount++;
        updates.push({
          id: ind.id,
          roomId: '',
          roomNumber: '',
          hotelName: ''
        });
      }
    }

    for (const u of updates) {
      await db.updateParticipant(u.id, {
        roomId: u.roomId,
        roomNumber: u.roomNumber,
        hotelName: u.hotelName
      });
    }

    setRoomAllocationApproved(false);
    setRefreshTrigger(prev => prev + 1);

    if (unallocatedCount > 0) {
      alert(`Room allocation completed! ${updates.length - unallocatedCount} devotees placed. Notice: ${unallocatedCount} devotees could not be accommodated. Please add more rooms.`);
    } else {
      alert(`🎉 Room allocation successful! All ${devotees.length} devotees have been allocated rooms. Review assignments below and click 'Approve & Publish' when ready.`);
    }
  };

  const sendRoomWhatsApp = (participant, room, hotel) => {
    if (!participant || !participant.phone || !room) return;
    const phone = participant.phone.replace(/[^0-9]/g, '');
    const cleanPhone = phone.startsWith('91') && phone.length === 12 ? phone : (phone.length === 10 ? '91' + phone : phone);
    const memberNames = participant.familyMembers && participant.familyMembers.length > 0 
      ? participant.familyMembers.map(m => m.name).join(', ') 
      : participant.name;

    const text = `🏨 *Hare Krishna ${participant.name}!* \n\nHere are your official *Hotel Room & Stay Details* for *${selectedYatra.name}*:\n\n*Hotel:* ${hotel?.name || room.hotelName || 'Yatra Hotel'}\n*Room Number:* ${room.roomNumber} (${room.roomType || 'Standard Room'}, ${room.floor || 'Floor 1'})\n*Allocated For:* ${memberNames}\n*Hotel Address:* ${hotel?.address || selectedYatra.destination}\n${hotel?.gmapsLink ? `*Google Maps Link:* ${hotel.gmapsLink}\n` : ''}👤 *Hotel Contact:* ${hotel?.contactPerson || 'Reception'} (${hotel?.phone || ''})\n\nYou can also check your room details anytime in your devotee portal:\n👉 ${window.location.href.split('#')[0]}#/login\n\nHaribol! 🙏`;

    window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`, '_blank');
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
    if (newParticipant.type === 'family' && (!newParticipant.familyMembers || newParticipant.familyMembers.length === 0)) {
      alert("Please add at least one family member (including yourself) in the list before proceeding.");
      return;
    }
    const pId = 'part_' + Math.random().toString(36).substring(2, 9);
    const participantRecord = {
      ...newParticipant,
      id: pId,
      yatraId: selectedYatra.id,
      status: 'interested',
      paymentStatus: 'pending'
    };
    await db.addParticipant(participantRecord);
    await db.saveDevoteeProfile(participantRecord);
    setPaymentParticipant(participantRecord);
    
    // Pre-calculate payment amount
    if (selectedYatra?.pricePerPerson) {
      let billable = 1;
      if (participantRecord.type === 'family') {
        if (participantRecord.familyMembers && participantRecord.familyMembers.length > 0) {
          billable = participantRecord.familyMembers.filter(m => !m.age || parseInt(m.age) >= 5).length || 1;
        } else {
          billable = participantRecord.membersCount || 1;
        }
      }
      const initialDue = billable * parseFloat(selectedYatra.pricePerPerson);
      setPublicPayAmount(initialDue.toString());
    }

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
      paymentMethod: publicPayMethod,
      transactionRef: publicPayMethod === 'upi' ? publicPayRef : 'CASH PAYMENT',
      paymentDate: publicPayDate,
      screenshotUrl: publicPayMethod === 'upi' ? publicPayScreenshot : '',
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
    await db.saveDevoteeProfile(editProfileData);
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
      const allPays = await db.getPayments(selectedYatra.id);
      const verifiedPaid = allPays
        .filter(pay => pay.participantId === participantId && (pay.id === paymentId || pay.status === 'verified'))
        .reduce((sum, pay) => sum + pay.amountPaid, 0);

      const splitInfo = expCalc.splits.find(s => s.id === participantId);
      const share = splitInfo ? splitInfo.share : 0;
      const isCompleted = share > 0 ? (verifiedPaid >= share) : true;
      
      const updates = {
        paymentStatus: isCompleted ? 'completed' : 'partially_paid'
      };
      if (isCompleted) {
        updates.status = 'confirmed'; // Automatically update status to confirmed when payment completed
      }
      await db.updateParticipant(participantId, updates);
    } else {
      await db.updateParticipant(participantId, { paymentStatus: 'pending' });
    }
    setRefreshTrigger(prev => prev + 1);
  };

  // --- Split Calculation Math ---
  const getExpenseCalculations = () => {
    const yatraPrice = selectedYatra ? parseFloat(selectedYatra.pricePerPerson) || 0 : 0;

    const confirmedCount = participants
      .filter(p => p.status === 'confirmed')
      .reduce((sum, p) => sum + (p.type === 'family' ? p.membersCount : 1), 0);

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    // Use yatra pricePerPerson if set, else fall back to expense-based split
    const amountPerPerson = yatraPrice > 0 ? yatraPrice : (confirmedCount > 0 ? (totalExpenses / confirmedCount) : 0);

    // Helper: count billable members for a participant (children under 5 are free)
    const getBillableCount = (p) => {
      if (p.type !== 'family') return 1;
      // If structured familyMembers array exists, exclude children under 5
      if (p.familyMembers && Array.isArray(p.familyMembers) && p.familyMembers.length > 0) {
        const billable = p.familyMembers.filter(m => !m.age || parseInt(m.age) >= 5).length;
        return Math.max(billable, 1); // At least 1 (the primary registrant)
      }
      // Fallback to membersCount if no structured data
      return p.membersCount || 1;
    };

    // Calculate details for individuals and families
    const participantSplits = participants.map(p => {
      const headCount = p.type === 'family' ? p.membersCount : 1;
      const billableCount = getBillableCount(p);
      // If admin has set a customPrice for this participant, use it as the total share directly
      const customTotal = p.customPrice ? parseFloat(p.customPrice) : 0;
      const share = customTotal > 0 ? customTotal : (yatraPrice > 0 ? billableCount * yatraPrice : headCount * amountPerPerson);
      
      // Calculate payments verified
      const verifiedPaid = payments
        .filter(pay => pay.participantId === p.id && pay.status === 'verified')
        .reduce((sum, pay) => sum + pay.amountPaid, 0);

      const balance = share - verifiedPaid;
      const dynamicPaymentStatus = verifiedPaid === 0 ? 'pending' : (balance > 0 ? 'partially_paid' : 'completed');
      const dynamicDevoteeStatus = (dynamicPaymentStatus === 'completed' && p.status === 'interested') ? 'confirmed' : p.status;

      return {
        ...p,
        headCount,
        billableCount,
        share,
        paid: verifiedPaid,
        balance,
        dynamicPaymentStatus,
        dynamicDevoteeStatus
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
  const sendWhatsApp = (participant, template, extraData = {}) => {
    if (!participant || !participant.phone) {
      alert("No phone number found for this participant.");
      return;
    }
    const phone = participant.phone.replace(/[^0-9]/g, '');
    let text = '';
    
    // Correct URL handling on GitHub Pages (preserves repo path)
    const baseUrl = window.location.href.split('#')[0];
    const paymentUrl = `${baseUrl}#/payment/${participant.id}`;
    const portalUrl = `${baseUrl}#/login`;

    // Compute dynamic financial numbers
    const splitInfo = expCalc.splits.find(s => s.id === participant.id);
    const totalDue = splitInfo ? splitInfo.share : (participant.customAmount ? parseFloat(participant.customAmount) : 0);
    const paidSoFar = splitInfo ? splitInfo.paid : 0;
    const balance = Math.max(0, totalDue - paidSoFar);
    
    switch (template) {
      case 'welcome':
        text = `🙏 *Hare Krishna ${participant.name}!* \n\nThank you for registering for the sacred *${selectedYatra.name}* to *${selectedYatra.destination}* (${selectedYatra.startDate} to ${selectedYatra.endDate}).\n\n📌 *Booking Details:*\n- Type: ${participant.type === 'family' ? `Family Group (${participant.familyName || participant.name})` : 'Individual Traveller'}\n- Registered Members: ${participant.membersCount || 1}\n- Total Yatra Contribution: ₹${totalDue.toLocaleString('en-IN')}\n\n💳 *Payment & Receipt Submission:*\nPlease complete your contribution and upload your screenshot here:\n👉 ${paymentUrl}\n\nUPI ID: *${selectedYatra.upiId}* (${selectedYatra.upiName})\n\nLooking forward to having you on this divine journey! Haribol! 🙏`;
        break;
      case 'payment_reminder':
        text = `🙏 *Hare Krishna ${participant.name}!* \n\nThis is a gentle reminder regarding your seat confirmation for *${selectedYatra.name}*.\n\n📊 *Your Contribution Status:*\n- Total Amount: ₹${totalDue.toLocaleString('en-IN')}\n- Paid So Far: ₹${paidSoFar.toLocaleString('en-IN')}\n- *Pending Balance: ₹${balance.toLocaleString('en-IN')}*\n\n💳 *UPI Details:*\nUPI ID: *${selectedYatra.upiId}*\nName: ${selectedYatra.upiName}\n\nKindly submit your payment screenshot here to confirm your seats:\n👉 ${paymentUrl}\n\nThank you! Haribol! 🙏`;
        break;
      case 'payment_verified':
        const verifiedAmt = extraData.amount || paidSoFar;
        text = `🎉 *Hare Krishna ${participant.name}!* \n\nWe have verified your payment of *₹${Number(verifiedAmt).toLocaleString('en-IN')}* for *${selectedYatra.name}*!\n\n✅ *Status:* ${balance <= 0 ? 'Booking Fully CONFIRMED! 🎊' : `Partially Paid (Remaining Balance: ₹${balance.toLocaleString('en-IN')})`}\n\n📱 *Devotee Portal:*\nYou can log in with your mobile number (*${participant.phone}*) to access itinerary notes, travel updates, and photo memories:\n👉 ${portalUrl}\n\nHaribol! 🙏`;
        break;
      case 'itinerary_update':
        text = `📢 *Yatra Itinerary & Travel Update - ${selectedYatra.name}*\n\nHare Krishna ${participant.name}!\n\nOrganizers have posted important updates for our upcoming yatra to ${selectedYatra.destination}.\n\nPlease check your devotee portal for details and hotel contacts:\n👉 ${portalUrl}\n\nHaribol! 🙏`;
        break;
      default:
        text = `🙏 Hare Krishna ${participant.name}!\n\nGreetings from ${selectedYatra.name} organizing team.`;
    }

    const cleanPhone = phone.startsWith('91') && phone.length === 12 ? phone : (phone.length === 10 ? '91' + phone : phone);
    const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
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
        typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : (typeof val === 'object' ? `"${JSON.stringify(val).replace(/"/g, '""')}"` : val)
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

  // --- Flattened Participant CSV (family members as individual rows) ---
  const exportParticipantCSV = () => {
    const headers = ['Registration ID', 'Family/Group Name', 'Member Name', 'Relation', 'Age', 'Phone', 'Email', 'Location', 'Travel Mode', 'Travel Type', 'Boarding Station', 'Dropping Station', 'Status', 'Payment Status', 'Remarks'];
    
    const rows = [];
    participants.forEach(p => {
      const splitData = expCalc.splits.find(s => s.id === p.id);
      const payStatus = splitData?.dynamicPaymentStatus || p.paymentStatus;
      const devoteeStatus = (payStatus === 'completed' && p.status === 'interested') ? 'confirmed' : (splitData?.dynamicDevoteeStatus || p.status);

      if (p.type === 'family' && p.familyMembers && Array.isArray(p.familyMembers) && p.familyMembers.length > 0) {
        // Each family member becomes a row
        p.familyMembers.forEach(member => {
          rows.push([
            p.id,
            p.familyName || p.name,
            member.name || '',
            member.relation || '',
            member.age || '',
            member.phone || p.phone,
            p.email,
            p.location,
            p.travelMode || '',
            p.travelType || '',
            p.boardingStation || '',
            p.droppingStation || '',
            devoteeStatus,
            payStatus,
            p.remarks || ''
          ]);
        });
      } else {
        // Individual participant — single row
        rows.push([
          p.id,
          p.type === 'family' ? (p.familyName || p.name) : '—',
          p.name,
          'Self',
          '',
          p.phone,
          p.email,
          p.location,
          p.travelMode || '',
          p.travelType || '',
          p.boardingStation || '',
          p.droppingStation || '',
          devoteeStatus,
          payStatus,
          p.remarks || ''
        ]);
      }
    });

    const csvRows = rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','));
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...csvRows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${selectedYatra.name}_Participants_Detailed.csv`);
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
    <div className={`app-container ${!currentUser ? 'login-bg-theme' : ''}`}>
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
              {(currentUser.role === 'admin' || currentUser.role === 'super_admin') && (
                <button
                  className="btn btn-outline"
                  style={{ padding: '0.5rem' }}
                  title="Refresh Data"
                  onClick={() => setRefreshTrigger(prev => prev + 1)}
                >
                  <RefreshCw size={18} />
                </button>
              )}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <h2 style={{ fontSize: '1.75rem', margin: 0 }}>{selectedYatra.name}</h2>
                    <span 
                      className={`badge badge-${selectedYatra.status}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        textTransform: 'uppercase',
                        fontWeight: '700',
                        fontSize: '0.75rem',
                        padding: '0.25rem 0.6rem',
                        backgroundColor: selectedYatra.status === 'planning' ? '#fef3c7' : (selectedYatra.status === 'registration_open' ? 'var(--primary-light)' : (selectedYatra.status === 'confirmed' ? 'var(--success-light)' : '#f1f5f9')),
                        color: selectedYatra.status === 'planning' ? '#b45309' : (selectedYatra.status === 'registration_open' ? 'var(--primary)' : (selectedYatra.status === 'confirmed' ? 'var(--success)' : '#475569')),
                        border: `1px solid ${selectedYatra.status === 'planning' ? '#fde68a' : (selectedYatra.status === 'registration_open' ? 'var(--primary)' : (selectedYatra.status === 'confirmed' ? 'var(--success-border)' : 'var(--border)'))}`
                      }}
                    >
                      {selectedYatra.status === 'planning' && <Clock size={13} />}
                      {selectedYatra.status === 'registration_open' && <Share2 size={13} />}
                      {selectedYatra.status === 'confirmed' && <CheckCircle size={13} />}
                      {selectedYatra.status === 'completed' && <Compass size={13} />}
                      {selectedYatra.status === 'planning' ? 'Planning Stage' : (selectedYatra.status === 'registration_open' ? 'Registration Open' : (selectedYatra.status === 'confirmed' ? 'Yatra Confirmed' : 'Yatra Completed'))}
                    </span>
                  </div>
                  <p style={{ color: 'var(--text-muted)' }}>📍 {selectedYatra.destination} | 📅 {selectedYatra.startDate} to {selectedYatra.endDate}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {(currentUser.role === 'admin' || currentUser.role === 'super_admin') && (
                  <>
                    <button className="btn btn-outline" onClick={() => {
                      setEditingYatraId(selectedYatra.id);
                      setNewYatra({
                        name: selectedYatra.name,
                        destination: selectedYatra.destination,
                        startDate: selectedYatra.startDate,
                        endDate: selectedYatra.endDate,
                        expectedParticipants: selectedYatra.expectedParticipants || 30,
                        pricePerPerson: selectedYatra.pricePerPerson || '',
                        customQrImageUrl: selectedYatra.customQrImageUrl || '',
                        upiId: selectedYatra.upiId,
                        upiName: selectedYatra.upiName,
                        registrationDeadline: selectedYatra.registrationDeadline || ''
                      });
                      setIsCreateYatraOpen(true);
                    }}>
                      <Edit2 size={16} /> Edit
                    </button>
                    {!selectedYatra.isDeleted && (
                      <button className="btn btn-danger" onClick={() => handleDeleteYatra(selectedYatra.id)}>
                        <Trash2 size={16} /> Delete
                      </button>
                    )}
                    {selectedYatra.isDeleted && currentUser.role === 'super_admin' && (
                      <button className="btn btn-primary" style={{ backgroundColor: 'var(--success)' }} onClick={() => handleRestoreYatra(selectedYatra.id)}>
                        <RefreshCw size={16} /> Restore
                      </button>
                    )}
                  </>
                )}
                {selectedYatra.status === 'planning' ? (
                  <button 
                    className="btn btn-outline" 
                    style={{ borderColor: 'var(--warning)', color: 'var(--warning)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', opacity: 0.85 }} 
                    onClick={() => alert("Registration link is locked during Planning stage. Finalize Yatra essentials (price, hotels, estimated devotees), then switch stage to 'Registration Open' to enable public registrations.")}
                    title="Registration link locked during Planning stage"
                  >
                    <Lock size={15} /> Reg. Link (Locked - Planning)
                  </button>
                ) : selectedYatra.status === 'confirmed' ? (
                  <button 
                    className="btn btn-outline" 
                    style={{ borderColor: 'var(--success)', color: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }} 
                    onClick={() => alert("This Yatra is Confirmed, so public registration is now closed. Admins can still add devotees individually from the Participants tab.")}
                    title="Public registration closed (Yatra Confirmed)"
                  >
                    <CheckCircle size={15} /> Yatra Confirmed (Public Closed)
                  </button>
                ) : selectedYatra.status === 'completed' ? (
                  <button 
                    className="btn btn-outline" 
                    disabled 
                    style={{ opacity: 0.6, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <Compass size={15} /> Yatra Completed
                  </button>
                ) : (
                  <button className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }} onClick={() => {
                    const baseUrl = window.location.href.split('#')[0];
                    navigator.clipboard.writeText(`${baseUrl}#/register/${selectedYatra.id}`);
                    alert("Copied public registration link to clipboard! Devotees can now register.");
                  }}>
                    <Share2 size={16} /> Share Registration Link
                  </button>
                )}
                <select 
                  value={selectedYatra.status}
                  onChange={async (e) => {
                    const newStatus = e.target.value;
                    const updated = await db.updateYatra(selectedYatra.id, { status: newStatus });
                    setSelectedYatra(updated);
                    setRefreshTrigger(prev => prev + 1);
                  }}
                  style={{ width: 'auto', padding: '0.5rem 2rem 0.5rem 0.75rem', fontWeight: '600' }}
                >
                  <option value="planning">Stage 1: Planning</option>
                  <option value="registration_open">Stage 2: Registration Open</option>
                  <option value="confirmed">Stage 3: Confirmed</option>
                  <option value="completed">Stage 4: Completed</option>
                </select>
              </div>
            </div>

            {/* TABBED MENU */}
            <div className="tab-container">
              <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}><Compass size={16} /> Overview</button>
              <button className={`tab-btn ${activeTab === 'bus_allocation' ? 'active' : ''}`} onClick={() => setActiveTab('bus_allocation')} style={{ position: 'relative' }}>
                <Bus size={16} /> Bus Allocation
                {selectedYatra.status === 'confirmed' && <span style={{ width: 7, height: 7, backgroundColor: 'var(--success)', borderRadius: '50%', position: 'absolute', top: 6, right: 6 }} />}
              </button>
              <button className={`tab-btn ${activeTab === 'room_allocation' ? 'active' : ''}`} onClick={() => setActiveTab('room_allocation')} style={{ position: 'relative' }}>
                <Bed size={16} /> Room Allocation
                {selectedYatra.status === 'confirmed' && <span style={{ width: 7, height: 7, backgroundColor: 'var(--success)', borderRadius: '50%', position: 'absolute', top: 6, right: 6 }} />}
              </button>
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
            {activeTab === 'overview' && (() => {
              const targetSeats = selectedYatra.expectedParticipants || 30;
              const yPrice = parseFloat(selectedYatra.pricePerPerson) || 0;
              const totalRegisteredSeats = participants.reduce((sum, p) => sum + (p.type === 'family' ? (p.membersCount || p.familyMembers?.length || 1) : 1), 0);
              const confirmedSeats = participants.filter(p => (expCalc.splits.find(s => s.id === p.id)?.dynamicDevoteeStatus || p.status) === 'confirmed').reduce((sum, p) => sum + (p.type === 'family' ? (p.membersCount || p.familyMembers?.length || 1) : 1), 0);
              const interestedSeats = participants.filter(p => (expCalc.splits.find(s => s.id === p.id)?.dynamicDevoteeStatus || p.status) === 'interested').reduce((sum, p) => sum + (p.type === 'family' ? (p.membersCount || p.familyMembers?.length || 1) : 1), 0);
              const seatPercent = Math.min(100, Math.round((totalRegisteredSeats / targetSeats) * 100));

              // Financial Metrics
              const projectedBudget = targetSeats * yPrice;
              const totalCollected = expCalc.totalCollected;
              const projectedDeficit = Math.max(0, projectedBudget - totalCollected);
              const registeredDues = expCalc.totalOutstanding;

              // Logistics & Accommodations
              const organisedTravelCount = participants.filter(p => p.travelMode === 'organised').reduce((s, p) => s + (p.type === 'family' ? (p.membersCount || p.familyMembers?.length || 1) : 1), 0);
              const selfTravelCount = participants.filter(p => p.travelMode === 'self').reduce((s, p) => s + (p.type === 'family' ? (p.membersCount || p.familyMembers?.length || 1) : 1), 0);
              const selectedHotel = hotels.find(h => h.finalSelected);

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* YATRA LIFECYCLE 4-STAGE INTERACTIVE TRACKER */}
                  <div className="card" style={{ padding: '1.25rem 1.5rem', backgroundColor: 'var(--card-bg)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          🚩 Yatra Lifecycle Stage: <span style={{ color: selectedYatra.status === 'confirmed' ? 'var(--success)' : (selectedYatra.status === 'planning' ? 'var(--warning)' : 'var(--primary)'), fontWeight: 'bold' }}>{selectedYatra.status.replace('_', ' ').toUpperCase()}</span>
                        </h3>
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.83rem', color: 'var(--text-muted)' }}>
                          {selectedYatra.status === 'planning' && "Stage 1: Planning — Registration link not active. Admins input essentials (price, hotels, estimated devotees)."}
                          {selectedYatra.status === 'registration_open' && "Stage 2: Registration Open — Public link active. Devotees can self-register until Yatra reaches Confirmed."}
                          {selectedYatra.status === 'confirmed' && "Stage 3: Confirmed — Public registrations closed. Admins retain superpower to add devotees individually."}
                          {selectedYatra.status === 'completed' && "Stage 4: Completed — Yatra has concluded and all expenses are settled. Ready for next Yatra planning!"}
                        </p>
                      </div>
                      
                      {/* Contextual Action Buttons */}
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {selectedYatra.status === 'planning' && (
                          <button 
                            className="btn btn-primary"
                            style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem' }}
                            onClick={async () => {
                              const updated = await db.updateYatra(selectedYatra.id, { status: 'registration_open' });
                              setSelectedYatra(updated);
                              setRefreshTrigger(prev => prev + 1);
                              alert("Yatra stage changed to 'Registration Open'! You can now copy and share the public registration link.");
                            }}
                          >
                            Open Public Registrations →
                          </button>
                        )}
                        {selectedYatra.status === 'registration_open' && (
                          <button 
                            className="btn btn-primary"
                            style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem', backgroundColor: 'var(--success)', borderColor: 'var(--success)' }}
                            onClick={async () => {
                              if (window.confirm("Confirm this Yatra? This will close public registration to outside devotees, while still allowing you to add devotees manually.")) {
                                const updated = await db.updateYatra(selectedYatra.id, { status: 'confirmed' });
                                setSelectedYatra(updated);
                                setRefreshTrigger(prev => prev + 1);
                              }
                            }}
                          >
                            Confirm Yatra & Close Public Link →
                          </button>
                        )}
                        {selectedYatra.status === 'confirmed' && (
                          <button 
                            className="btn btn-outline"
                            style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem' }}
                            onClick={async () => {
                              if (window.confirm("Mark this Yatra as Completed? This archives the Yatra and confirms all accounts are settled.")) {
                                const updated = await db.updateYatra(selectedYatra.id, { status: 'completed' });
                                setSelectedYatra(updated);
                                setRefreshTrigger(prev => prev + 1);
                              }
                            }}
                          >
                            Mark Yatra Completed & Settle →
                          </button>
                        )}
                        {selectedYatra.status === 'completed' && (
                          <span style={{ fontSize: '0.82rem', fontWeight: 'bold', color: 'var(--success)', backgroundColor: 'var(--success-light)', padding: '0.35rem 0.75rem', borderRadius: 'var(--radius-sm)' }}>
                            ✓ All Settled & Concluded
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 4 Interactive Visual Stages */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.65rem' }}>
                      {[
                        { key: 'planning', label: '1. Planning', desc: 'Lock reg., set price & hotels', icon: Clock },
                        { key: 'registration_open', label: '2. Registration Open', desc: 'Public link active', icon: Share2 },
                        { key: 'confirmed', label: '3. Confirmed', desc: 'Public closed, admin adds', icon: CheckCircle },
                        { key: 'completed', label: '4. Completed', desc: 'Settled & ready for next', icon: Compass }
                      ].map((step, idx) => {
                        const isCurrent = selectedYatra.status === step.key;
                        const stages = ['planning', 'registration_open', 'confirmed', 'completed'];
                        const currentIndex = stages.indexOf(selectedYatra.status);
                        const isPast = currentIndex > idx;
                        const StepIcon = step.icon;

                        return (
                          <div 
                            key={step.key}
                            onClick={async () => {
                              const updated = await db.updateYatra(selectedYatra.id, { status: step.key });
                              setSelectedYatra(updated);
                              setRefreshTrigger(prev => prev + 1);
                            }}
                            style={{
                              padding: '0.75rem',
                              borderRadius: 'var(--radius-sm)',
                              border: isCurrent ? '2px solid var(--primary)' : '1px solid var(--border)',
                              backgroundColor: isCurrent ? 'var(--primary-light)' : (isPast ? 'var(--bg)' : 'transparent'),
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            title={`Click to set stage to ${step.label}`}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                              <StepIcon size={15} style={{ color: isCurrent ? 'var(--primary)' : (isPast ? 'var(--success)' : 'var(--text-muted)') }} />
                              <strong style={{ fontSize: '0.82rem', color: isCurrent ? 'var(--primary)' : 'var(--text-main)' }}>{step.label}</strong>
                              {isCurrent && <span style={{ fontSize: '0.68rem', backgroundColor: 'var(--primary)', color: '#fff', padding: '0.1rem 0.35rem', borderRadius: '1rem', marginLeft: 'auto' }}>Active</span>}
                            </div>
                            <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: '1.3' }}>{step.desc}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* TOP ROW: SEAT CAPACITY PROGRESS & FINANCIAL HEALTH */}
                  <div className="grid-cols-2">
                    {/* SEAT CAPACITY CARD */}
                    <div className="card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Users size={18} style={{ color: 'var(--primary)' }} /> Seat Capacity & Target</h3>
                        <span style={{ fontSize: '0.82rem', fontWeight: 'bold', color: seatPercent >= 100 ? 'var(--success)' : 'var(--primary)' }}>
                          {seatPercent}% Booked
                        </span>
                      </div>
                      
                      {/* Visual Progress Bar */}
                      <div style={{ width: '100%', height: '10px', backgroundColor: 'var(--bg)', borderRadius: '999px', overflow: 'hidden', marginBottom: '1rem', border: '1px solid var(--border)' }}>
                        <div style={{ width: `${seatPercent}%`, height: '100%', backgroundColor: seatPercent >= 100 ? 'var(--success)' : 'var(--primary)', transition: 'width 0.3s ease' }} />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                        <div style={{ backgroundColor: 'var(--bg)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Target Seats</span>
                          <h4 style={{ fontSize: '1.3rem', margin: '0.2rem 0 0' }}>{targetSeats}</h4>
                        </div>
                        <div style={{ backgroundColor: 'var(--bg)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Registered</span>
                          <h4 style={{ fontSize: '1.3rem', margin: '0.2rem 0 0', color: 'var(--primary)' }}>{totalRegisteredSeats}</h4>
                        </div>
                        <div style={{ backgroundColor: 'var(--bg)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Confirmed</span>
                          <h4 style={{ fontSize: '1.3rem', margin: '0.2rem 0 0', color: 'var(--success)' }}>{confirmedSeats}</h4>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        <span>Interested Devotees: <strong>{interestedSeats}</strong></span>
                        <span>Available Seats: <strong>{Math.max(0, targetSeats - totalRegisteredSeats)}</strong></span>
                      </div>
                    </div>

                    {/* FINANCIAL SNAPSHOT CARD (Projected Budget vs Collected vs Gap) */}
                    <div className="card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CreditCard size={18} style={{ color: 'var(--primary)' }} /> Financial Overview</h3>
                        {yPrice > 0 && (
                          <span style={{ fontSize: '0.8rem', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 'bold' }}>
                            ₹{yPrice.toLocaleString()} / seat
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div style={{ backgroundColor: 'var(--bg)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>🎯 Projected Yatra Inflow</span>
                          <h4 style={{ fontSize: '1.25rem', margin: '0.2rem 0 0', color: 'var(--text)' }}>
                            {yPrice > 0 ? `₹${projectedBudget.toLocaleString()}` : '—'}
                          </h4>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{targetSeats} seats × ₹{yPrice.toLocaleString()}</span>
                        </div>
                        <div style={{ backgroundColor: 'var(--bg)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>💵 Total Collected</span>
                          <h4 style={{ fontSize: '1.25rem', margin: '0.2rem 0 0', color: 'var(--success)' }}>
                            ₹{totalCollected.toLocaleString()}
                          </h4>
                          <span style={{ fontSize: '0.68rem', color: 'var(--success)' }}>Verified in bank</span>
                        </div>
                        <div style={{ backgroundColor: 'var(--bg)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid hsla(0, 84%, 60%, 0.2)' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>⚠️ Projected Collection Gap</span>
                          <h4 style={{ fontSize: '1.25rem', margin: '0.2rem 0 0', color: 'var(--danger)' }}>
                            {yPrice > 0 ? `₹${projectedDeficit.toLocaleString()}` : `₹${registeredDues.toLocaleString()}`}
                          </h4>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Target minus amount paid</span>
                        </div>
                        <div style={{ backgroundColor: 'var(--bg)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>📋 Registered Devotee Dues</span>
                          <h4 style={{ fontSize: '1.25rem', margin: '0.2rem 0 0', color: 'var(--primary)' }}>
                            ₹{registeredDues.toLocaleString()}
                          </h4>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Pending from current registrations</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* BOTTOM ROW: LOGISTICS, HOTEL & SCANNER */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '1.5rem' }}>
                    {/* TRAVEL LOGISTICS SNAPSHOT */}
                    <div className="card">
                      <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        🚌 Travel Logistics
                      </h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Overview of transport arrangements required:</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', backgroundColor: 'var(--bg)', borderRadius: 'var(--radius-sm)' }}>
                          <span style={{ fontSize: '0.85rem' }}>🚌 <strong>As Organised (Bus/Train):</strong></span>
                          <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{organisedTravelCount} seat{organisedTravelCount === 1 ? '' : 's'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', backgroundColor: 'var(--bg)', borderRadius: 'var(--radius-sm)' }}>
                          <span style={{ fontSize: '0.85rem' }}>🚗 <strong>Self Travel (Air/Rail/Road):</strong></span>
                          <span style={{ fontWeight: 'bold' }}>{selfTravelCount} seat{selfTravelCount === 1 ? '' : 's'}</span>
                        </div>
                      </div>
                      <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Organisers can view station details in the Participants Tab.
                      </div>
                    </div>

                    {/* HOTEL RESEARCH STATUS */}
                    <div className="card">
                      <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <Hotel size={16} style={{ color: 'var(--primary)' }} /> Accommodations
                      </h4>
                      {selectedHotel ? (
                        <div style={{ backgroundColor: 'var(--success-light)', border: '1px solid hsla(142,70%,45%,0.3)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 'bold' }}>✓ Final Selected Hotel</span>
                          <div style={{ fontWeight: 'bold', fontSize: '0.95rem', marginTop: '0.2rem' }}>{selectedHotel.name}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>📍 {selectedHotel.address}</div>
                          <div style={{ fontSize: '0.78rem', marginTop: '0.35rem' }}>
                            <strong>📞 Contact:</strong> {selectedHotel.contactPerson} ({selectedHotel.phone})
                          </div>
                          <div style={{ fontSize: '0.78rem', marginTop: '0.2rem' }}>
                            <strong>Rooms:</strong> {selectedHotel.roomsAvailable} | <strong>Price:</strong> ₹{selectedHotel.roomPrice}/night
                          </div>
                        </div>
                      ) : (
                        <div style={{ backgroundColor: 'var(--bg)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 0.5rem 0' }}>No final hotel selected yet.</p>
                          <button className="btn btn-outline" style={{ fontSize: '0.78rem', padding: '0.35rem 0.6rem' }} onClick={() => setActiveTab('hotels')}>
                            View {hotels.length} Evaluated Hotels
                          </button>
                        </div>
                      )}
                    </div>

                    {/* PAYMENT SCANNER & UPI */}
                    <div className="card" style={{ textAlign: 'center' }}>
                      <h4 style={{ margin: '0 0 0.5rem 0' }}>📱 Payment Scanner</h4>
                      <div style={{ display: 'inline-block', backgroundColor: 'var(--bg)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginBottom: '0.5rem' }}>
                        <img 
                          src={selectedYatra.customQrImageUrl || getUPIQRCodeUrl(selectedYatra.upiId, selectedYatra.upiName, 0, selectedYatra.name)} 
                          alt="UPI QR Scanner" 
                          style={{ width: '110px', height: '110px', objectFit: 'contain', backgroundColor: 'white' }}
                        />
                      </div>
                      <div style={{ fontSize: '0.8rem' }}>
                        <code>{selectedYatra.upiId}</code>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{selectedYatra.upiName}</div>
                      </div>
                      <button 
                        className="btn btn-outline" 
                        style={{ width: '100%', fontSize: '0.75rem', padding: '0.3rem 0.5rem', marginTop: '0.5rem' }}
                        onClick={() => {
                          navigator.clipboard.writeText(selectedYatra.upiId);
                          alert("UPI ID copied to clipboard!");
                        }}
                      >
                        Copy UPI ID
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ======================================= */}
            {/* TAB: BUS ALLOCATION (STAGE 3 LOGISTICS) */}
            {/* ======================================= */}
            {activeTab === 'bus_allocation' && (
              <div>
                {/* Header & Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <h3 style={{ margin: 0 }}>🚌 Bus Fleet Logistics & Seat Allocation</h3>
                      <span className={`badge ${busAllocationApproved ? 'badge-confirmed' : 'badge-interested'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        {busAllocationApproved ? <Check size={13} /> : <AlertTriangle size={13} />}
                        {busAllocationApproved ? 'Layout Approved & Published' : 'Draft Layout (Unpublished)'}
                      </span>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                      Stage 3 Confirmed Logistics: Input bus coaches, auto-allocate devotees opting for <strong>Organizer Arrangements</strong> (keeps all family members together), review/edit layout, and trigger WhatsApp passes.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button 
                      className="btn btn-primary" 
                      onClick={() => {
                        setEditingBusId(null);
                        setNewBus({ name: `Bus ${buses.length + 1}`, busNumber: '', route: `${selectedYatra.destination} Route`, capacity: 35, coordinatorName: '', coordinatorPhone: '', driverName: '', driverPhone: '', departureTime: '06:00 AM (Day 1)', boardingPoint: '', notes: '' });
                        setIsAddBusOpen(true);
                      }}
                    >
                      <Plus size={16} /> Add Bus Coach
                    </button>
                    <button 
                      className="btn btn-outline" 
                      style={{ borderColor: 'var(--primary)', color: 'var(--primary)', fontWeight: 600 }}
                      onClick={autoAllocateBuses}
                      title="Optimally assigns devotees into buses keeping all family members in the same coach"
                    >
                      <Shuffle size={16} /> Auto-Allocate Devotees
                    </button>
                    <button 
                      className={`btn ${busAllocationApproved ? 'btn-outline' : 'btn-primary'}`} 
                      style={{ backgroundColor: busAllocationApproved ? 'transparent' : 'var(--success)', borderColor: 'var(--success)', color: busAllocationApproved ? 'var(--success)' : 'white' }}
                      onClick={() => {
                        setBusAllocationApproved(true);
                        alert("🎉 Bus Allocation Layout Approved & Published!\nDevotees can now access their verified bus pass in the Devotee Portal.");
                      }}
                    >
                      <CheckCircle size={16} /> {busAllocationApproved ? 'Layout Approved' : 'Approve & Publish'}
                    </button>
                  </div>
                </div>

                {/* Fleet Overview KPIs */}
                {(() => {
                  const organisedDevotees = participants.filter(p => p.travelMode === 'organised');
                  const totalOrganisedPax = organisedDevotees.reduce((sum, p) => sum + ((p.familyMembers && p.familyMembers.length) || p.membersCount || 1), 0);
                  const totalFleetCapacity = buses.reduce((sum, b) => sum + (parseInt(b.capacity) || 0), 0);
                  const allocatedDevotees = organisedDevotees.filter(p => p.busId);
                  const totalAllocatedPax = allocatedDevotees.reduce((sum, p) => sum + ((p.familyMembers && p.familyMembers.length) || p.membersCount || 1), 0);
                  const unallocatedPax = totalOrganisedPax - totalAllocatedPax;
                  const selfTravelCount = participants.filter(p => p.travelMode === 'self').length;

                  return (
                    <div className="grid-cols-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                      <div className="card" style={{ padding: '1rem', borderLeft: '4px solid var(--primary)' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Fleet Capacity</span>
                        <h3 style={{ margin: '0.25rem 0', color: 'var(--primary)' }}>{totalFleetCapacity} Seats</h3>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Across {buses.length} active coaches</span>
                      </div>
                      <div className="card" style={{ padding: '1rem', borderLeft: '4px solid var(--warning)' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Organiser Travel Devotees</span>
                        <h3 style={{ margin: '0.25rem 0', color: 'var(--warning)' }}>{totalOrganisedPax} Devotees</h3>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>From {organisedDevotees.length} booking groups</span>
                      </div>
                      <div className="card" style={{ padding: '1rem', borderLeft: '4px solid var(--success)' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Allocated / Remaining Seats</span>
                        <h3 style={{ margin: '0.25rem 0', color: 'var(--success)' }}>{totalAllocatedPax} / {totalFleetCapacity}</h3>
                        <span style={{ fontSize: '0.75rem', color: totalFleetCapacity - totalAllocatedPax >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                          {totalFleetCapacity - totalAllocatedPax} seats available
                        </span>
                      </div>
                      <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #6366f1' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Self-Arranged Travel</span>
                        <h3 style={{ margin: '0.25rem 0', color: '#6366f1' }}>{selfTravelCount} Devotees</h3>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Exempt from bus seating</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Fleet Coaches List */}
                {buses.length === 0 ? (
                  <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
                    <Bus size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                    <h4>No Bus Coaches Added Yet</h4>
                    <p style={{ maxWidth: '480px', margin: '0.5rem auto 1.5rem' }}>
                      Add your tour buses (e.g. Bus 1 with 35 seats, Bus 2 with 30 seats) along with coordinators and routes. Then use <strong>Auto-Allocate</strong> to seat devotees with families intact.
                    </p>
                    <button className="btn btn-primary" onClick={() => {
                      setEditingBusId(null);
                      setNewBus({ name: 'Bus 1 (AC Coach)', busNumber: '', route: `${selectedYatra.destination} Route`, capacity: 35, coordinatorName: '', coordinatorPhone: '', driverName: '', driverPhone: '', departureTime: '06:00 AM (Day 1)', boardingPoint: '', notes: '' });
                      setIsAddBusOpen(true);
                    }}>
                      <Plus size={16} /> Add First Bus Coach
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {buses.map(bus => {
                      const assignedDevotees = participants.filter(p => p.busId === bus.id);
                      const totalOccupiedSeats = assignedDevotees.reduce((sum, p) => sum + ((p.familyMembers && p.familyMembers.length) || p.membersCount || 1), 0);
                      const cap = parseInt(bus.capacity) || 35;
                      const occupancyPercent = Math.min(100, Math.round((totalOccupiedSeats / cap) * 100));
                      const isOverCapacity = totalOccupiedSeats > cap;

                      return (
                        <div key={bus.id} className="card" style={{ border: isOverCapacity ? '1.5px solid var(--danger)' : '1px solid var(--border)', overflow: 'hidden' }}>
                          {/* Bus Header */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                              <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Bus size={22} />
                              </div>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <h4 style={{ margin: 0 }}>{bus.name}</h4>
                                  {bus.busNumber && <span className="badge" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}>{bus.busNumber}</span>}
                                  {isOverCapacity && <span className="badge badge-danger">Capacity Exceeded!</span>}
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                                  <span>🛣️ {bus.route || 'Tour Route'}</span>
                                  {bus.boardingPoint && <span>📍 Boarding: {bus.boardingPoint}</span>}
                                  {bus.departureTime && <span>⏰ Dep: {bus.departureTime}</span>}
                                </div>
                              </div>
                            </div>

                            {/* Occupancy Indicator & Action Buttons */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                              <div style={{ textAlign: 'right', minWidth: '150px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                                  <span style={{ color: 'var(--text-muted)' }}>Occupancy</span>
                                  <strong>{totalOccupiedSeats} / {cap} Seats ({occupancyPercent}%)</strong>
                                </div>
                                <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg)', borderRadius: '4px', overflow: 'hidden' }}>
                                  <div style={{ 
                                    width: `${occupancyPercent}%`, 
                                    height: '100%', 
                                    backgroundColor: isOverCapacity ? 'var(--danger)' : occupancyPercent > 85 ? 'var(--warning)' : 'var(--success)',
                                    transition: 'width 0.3s' 
                                  }} />
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '0.35rem' }}>
                                <button 
                                  className="btn btn-outline" 
                                  style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                                  onClick={() => {
                                    setEditingBusId(bus.id);
                                    setNewBus({ ...bus });
                                    setIsAddBusOpen(true);
                                  }}
                                  title="Edit Bus Details"
                                >
                                  <Edit2 size={13} /> Edit
                                </button>
                                <button 
                                  className="btn btn-outline" 
                                  style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', color: 'var(--danger)', borderColor: 'var(--border)' }}
                                  onClick={() => handleDeleteBus(bus.id)}
                                  title="Delete Bus"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Coordinator & Crew info */}
                          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', padding: '0.75rem 0', fontSize: '0.8rem', color: 'var(--text)', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg)', margin: '0 -1.5rem', paddingLeft: '1.5rem', paddingRight: '1.5rem' }}>
                            <span>👤 <strong>Bus Coordinator:</strong> {bus.coordinatorName ? `${bus.coordinatorName} (${bus.coordinatorPhone || 'No phone'})` : 'Not Assigned'}</span>
                            <span>👨‍✈️ <strong>Driver:</strong> {bus.driverName ? `${bus.driverName} (${bus.driverPhone || 'No phone'})` : 'Not Assigned'}</span>
                            {bus.notes && <span style={{ color: 'var(--text-muted)' }}>ℹ️ {bus.notes}</span>}
                          </div>

                          {/* Allocated Devotees List */}
                          <div style={{ marginTop: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>
                                Allocated Devotees & Families ({assignedDevotees.length} Groups • {totalOccupiedSeats} Seats)
                              </span>
                              {assignedDevotees.length > 0 && (
                                <button 
                                  className="btn btn-outline" 
                                  style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                                  onClick={() => {
                                    if (window.confirm(`Broadcast bus passes on WhatsApp to all ${assignedDevotees.length} devotees in ${bus.name}?`)) {
                                      assignedDevotees.forEach((d, idx) => {
                                        setTimeout(() => sendBusWhatsApp(d, bus), idx * 600);
                                      });
                                    }
                                  }}
                                >
                                  <MessageSquare size={12} /> Broadcast WhatsApp to Bus
                                </button>
                              )}
                            </div>

                            {assignedDevotees.length === 0 ? (
                              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: '0.5rem 0' }}>
                                No devotees allocated to this coach yet. Click 'Auto-Allocate Devotees' above or assign devotees below.
                              </p>
                            ) : (
                              <div className="table-container" style={{ margin: 0 }}>
                                <table style={{ fontSize: '0.85rem' }}>
                                  <thead>
                                    <tr>
                                      <th>Devotee / Family</th>
                                      <th>Seats</th>
                                      <th>Family Members Included</th>
                                      <th>Phone</th>
                                      <th>Reassign Bus</th>
                                      <th>Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {assignedDevotees.map(devotee => {
                                      const devoteePax = (devotee.familyMembers && devotee.familyMembers.length) || devotee.membersCount || 1;
                                      return (
                                        <tr key={devotee.id}>
                                          <td>
                                            <strong>{devotee.name}</strong>
                                            {devotee.type === 'family' && (
                                              <span className="badge" style={{ marginLeft: '0.4rem', fontSize: '0.7rem', backgroundColor: 'var(--warning-light)', color: 'var(--warning)' }}>
                                                Family
                                              </span>
                                            )}
                                          </td>
                                          <td>
                                            <span className="badge" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 600 }}>
                                              {devoteePax} Seat{devoteePax > 1 ? 's' : ''}
                                            </span>
                                          </td>
                                          <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem', maxWidth: '300px' }}>
                                            {devotee.familyMembers && devotee.familyMembers.length > 0 
                                              ? devotee.familyMembers.map(m => m.name).join(', ') 
                                              : devotee.name}
                                          </td>
                                          <td>
                                            <a href={`tel:${devotee.phone}`} style={{ color: 'var(--text)', textDecoration: 'none' }}>
                                              {devotee.phone}
                                            </a>
                                          </td>
                                          <td>
                                            <select 
                                              className="form-control" 
                                              style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', width: 'auto' }}
                                              value={devotee.busId || ''}
                                              onChange={(e) => handleReassignBus(devotee.id, e.target.value)}
                                            >
                                              <option value="">-- Unallocate --</option>
                                              {buses.map(b => (
                                                <option key={b.id} value={b.id}>{b.name}</option>
                                              ))}
                                            </select>
                                          </td>
                                          <td>
                                            <button 
                                              className="btn btn-outline" 
                                              style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', borderColor: '#25D366', color: '#25D366' }}
                                              onClick={() => sendBusWhatsApp(devotee, bus)}
                                              title="Send WhatsApp Bus Pass to Devotee"
                                            >
                                              <MessageSquare size={12} /> WhatsApp Pass
                                            </button>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Unallocated Organiser Devotees (if any) */}
                {(() => {
                  const unallocated = participants.filter(p => p.travelMode === 'organised' && !p.busId);
                  if (unallocated.length === 0) return null;
                  return (
                    <div className="card" style={{ marginTop: '2rem', border: '1.5px dashed var(--warning)', backgroundColor: 'var(--warning-light)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <AlertTriangle size={18} color="var(--warning)" />
                        <h4 style={{ margin: 0, color: 'var(--warning)' }}>Unallocated Organiser Devotees ({unallocated.length} Groups)</h4>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text)', marginBottom: '1rem' }}>
                        These devotees opted for Organizer arrangements but have not yet been assigned to a bus coach (or could not fit in the existing total capacity).
                      </p>
                      <div className="table-container" style={{ margin: 0 }}>
                        <table style={{ fontSize: '0.85rem', backgroundColor: 'var(--card-bg)' }}>
                          <thead>
                            <tr>
                              <th>Devotee Name</th>
                              <th>Group Size</th>
                              <th>Members</th>
                              <th>Assign to Bus</th>
                            </tr>
                          </thead>
                          <tbody>
                            {unallocated.map(devotee => {
                              const devoteePax = (devotee.familyMembers && devotee.familyMembers.length) || devotee.membersCount || 1;
                              return (
                                <tr key={devotee.id}>
                                  <td><strong>{devotee.name}</strong> ({devotee.phone})</td>
                                  <td><span className="badge">{devoteePax} Seat(s)</span></td>
                                  <td style={{ color: 'var(--text-muted)' }}>
                                    {devotee.familyMembers && devotee.familyMembers.length > 0 
                                      ? devotee.familyMembers.map(m => m.name).join(', ') 
                                      : devotee.name}
                                  </td>
                                  <td>
                                    <select 
                                      className="form-control" 
                                      style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                                      value=""
                                      onChange={(e) => handleReassignBus(devotee.id, e.target.value)}
                                    >
                                      <option value="" disabled>-- Select Bus --</option>
                                      {buses.map(b => (
                                        <option key={b.id} value={b.id}>{b.name} ({b.capacity} seats)</option>
                                      ))}
                                    </select>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}

                {/* Self-Arranged Devotees Reference */}
                <div className="card" style={{ marginTop: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <h4 style={{ margin: 0 }}>🚗 Devotees on Self-Arranged Travel ({participants.filter(p => p.travelMode === 'self').length})</h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Traveling via own car, train, or flight</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    These devotees manage their own transit directly to the dham/hotel and do not require organizer bus seat allocation.
                  </p>
                  <div className="table-container" style={{ margin: 0 }}>
                    <table style={{ fontSize: '0.85rem' }}>
                      <thead>
                        <tr>
                          <th>Devotee</th>
                          <th>Members</th>
                          <th>Transit Mode</th>
                          <th>Stations / Route</th>
                          <th>Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {participants.filter(p => p.travelMode === 'self').map(p => (
                          <tr key={p.id}>
                            <td><strong>{p.name}</strong> ({p.phone})</td>
                            <td>{(p.familyMembers && p.familyMembers.length) || p.membersCount || 1} Person(s)</td>
                            <td><span className="badge" style={{ textTransform: 'capitalize' }}>{p.travelType || 'Self'}</span></td>
                            <td style={{ color: 'var(--text-muted)' }}>{p.boardingStation ? `${p.boardingStation} ➔ ${p.droppingStation || selectedYatra.destination}` : 'Direct'}</td>
                            <td style={{ color: 'var(--text-muted)' }}>{p.remarks || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ======================================= */}
            {/* TAB: HOTEL ROOM ALLOCATION (STAGE 3) */}
            {/* ======================================= */}
            {activeTab === 'room_allocation' && (
              <div>
                {/* Header & Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <h3 style={{ margin: 0 }}>🏨 Hotel Room Allocation & Key Management</h3>
                      <span className={`badge ${roomAllocationApproved ? 'badge-confirmed' : 'badge-interested'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        {roomAllocationApproved ? <Check size={13} /> : <AlertTriangle size={13} />}
                        {roomAllocationApproved ? 'Room Layout Approved' : 'Draft Room Layout'}
                      </span>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                      Stage 3 Logistics: Input room inventory, auto-allocate families into dedicated rooms and individuals into comfortable shared rooms, and send WhatsApp room check-in passes.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button 
                      className="btn btn-primary" 
                      onClick={() => {
                        setEditingRoomId(null);
                        const primaryHotel = hotels.find(h => h.finalSelected) || hotels[0];
                        setNewRoom({ roomNumber: '', roomType: 'Double Bed', capacity: 2, floor: 'Ground Floor', hotelName: primaryHotel ? primaryHotel.name : 'Primary Hotel', extraMattressCost: 500, notes: '' });
                        setIsAddRoomOpen(true);
                      }}
                    >
                      <Plus size={16} /> Add Room Inventory
                    </button>
                    <button 
                      className="btn btn-outline" 
                      style={{ borderColor: 'var(--primary)', color: 'var(--primary)', fontWeight: 600 }}
                      onClick={autoAllocateRooms}
                      title="Allocates dedicated family rooms for families and pairs individuals into shared rooms"
                    >
                      <Shuffle size={16} /> Auto-Allocate Rooms
                    </button>
                    <button 
                      className={`btn ${roomAllocationApproved ? 'btn-outline' : 'btn-primary'}`} 
                      style={{ backgroundColor: roomAllocationApproved ? 'transparent' : 'var(--success)', borderColor: 'var(--success)', color: roomAllocationApproved ? 'var(--success)' : 'white' }}
                      onClick={() => {
                        setRoomAllocationApproved(true);
                        alert("🎉 Hotel Room Allocation Approved & Published!\nDevotees can now view their official room pass in their Devotee Portal.");
                      }}
                    >
                      <CheckCircle size={16} /> {roomAllocationApproved ? 'Layout Approved' : 'Approve & Publish'}
                    </button>
                  </div>
                </div>

                {/* KPI Stat Row */}
                {(() => {
                  const confirmedDevotees = participants.filter(p => p.status === 'confirmed' || p.status === 'interested');
                  const totalPax = confirmedDevotees.reduce((sum, p) => sum + ((p.familyMembers && p.familyMembers.length) || p.membersCount || 1), 0);
                  const totalBedCapacity = rooms.reduce((sum, r) => sum + (parseInt(r.capacity) || 0), 0);
                  const allocatedDevotees = confirmedDevotees.filter(p => p.roomId);
                  const totalAllocatedPax = allocatedDevotees.reduce((sum, p) => sum + ((p.familyMembers && p.familyMembers.length) || p.membersCount || 1), 0);

                  return (
                    <div className="grid-cols-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                      <div className="card" style={{ padding: '1rem', borderLeft: '4px solid var(--primary)' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Rooms Registered</span>
                        <h3 style={{ margin: '0.25rem 0', color: 'var(--primary)' }}>{rooms.length} Rooms</h3>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total {totalBedCapacity} bed slots</span>
                      </div>
                      <div className="card" style={{ padding: '1rem', borderLeft: '4px solid var(--warning)' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Devotees Requiring Stay</span>
                        <h3 style={{ margin: '0.25rem 0', color: 'var(--warning)' }}>{totalPax} Devotees</h3>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Across {confirmedDevotees.length} bookings</span>
                      </div>
                      <div className="card" style={{ padding: '1rem', borderLeft: '4px solid var(--success)' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Allocated Devotees</span>
                        <h3 style={{ margin: '0.25rem 0', color: 'var(--success)' }}>{totalAllocatedPax} Devotees</h3>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>In {rooms.filter(r => participants.some(p => p.roomId === r.id)).length} occupied rooms</span>
                      </div>
                      <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #8b5cf6' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Vacant Rooms</span>
                        <h3 style={{ margin: '0.25rem 0', color: '#8b5cf6' }}>{rooms.filter(r => !participants.some(p => p.roomId === r.id)).length} Available</h3>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ready for immediate check-in</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Rooms Grid */}
                {rooms.length === 0 ? (
                  <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
                    <Bed size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                    <h4>No Hotel Rooms Added Yet</h4>
                    <p style={{ maxWidth: '480px', margin: '0.5rem auto 1.5rem' }}>
                      Add your booked hotel room inventory (e.g. Room 101, 102, 201) and run auto-allocation to place families together into dedicated rooms.
                    </p>
                    <button className="btn btn-primary" onClick={() => {
                      setEditingRoomId(null);
                      const primaryHotel = hotels.find(h => h.finalSelected) || hotels[0];
                      setNewRoom({ roomNumber: '101', roomType: 'Double Bed', capacity: 2, floor: '1st Floor', hotelName: primaryHotel ? primaryHotel.name : 'Primary Hotel', extraMattressCost: 500, notes: '' });
                      setIsAddRoomOpen(true);
                    }}>
                      <Plus size={16} /> Add First Room
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
                    {rooms.map(room => {
                      const occupants = participants.filter(p => p.roomId === room.id);
                      const occupantPax = occupants.reduce((sum, p) => sum + ((p.familyMembers && p.familyMembers.length) || p.membersCount || 1), 0);
                      const roomCap = parseInt(room.capacity) || 2;
                      const isFull = occupantPax >= roomCap;
                      const hotelObj = hotels.find(h => h.name === room.hotelName) || hotels[0];

                      return (
                        <div key={room.id} className="card" style={{ padding: '1.25rem', border: isFull ? '1.5px solid var(--border)' : '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <div>
                            {/* Room Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                              <div>
                                <h4 style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <Bed size={16} color="var(--primary)" /> Room {room.roomNumber}
                                </h4>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.15rem' }}>
                                  {room.floor || 'Floor'} • {room.roomType || 'Standard'}
                                </span>
                              </div>
                              <span className={`badge ${occupantPax === 0 ? 'badge-interested' : isFull ? 'badge-confirmed' : 'badge-warning'}`}>
                                {occupantPax === 0 ? 'Vacant' : `${occupantPax} / ${roomCap} Beds`}
                              </span>
                            </div>

                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.25rem 0 0.75rem' }}>
                              🏨 {room.hotelName || 'Yatra Hotel'}
                            </p>

                            {/* Occupants */}
                            <div style={{ backgroundColor: 'var(--bg)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', minHeight: '80px', marginBottom: '0.75rem' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '0.35rem' }}>
                                Assigned Devotees:
                              </span>
                              {occupants.length === 0 ? (
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
                                  No occupants assigned yet.
                                </p>
                              ) : (
                                occupants.map(occ => {
                                  const occPax = (occ.familyMembers && occ.familyMembers.length) || occ.membersCount || 1;
                                  return (
                                    <div key={occ.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', fontSize: '0.8rem' }}>
                                      <div>
                                        <strong>{occ.name}</strong> ({occPax} pax)
                                        {occ.familyMembers && occ.familyMembers.length > 0 && (
                                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                            {occ.familyMembers.map(m => m.name).join(', ')}
                                          </div>
                                        )}
                                      </div>
                                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                                        <button 
                                          className="btn btn-outline" 
                                          style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem', borderColor: '#25D366', color: '#25D366' }}
                                          onClick={() => sendRoomWhatsApp(occ, room, hotelObj)}
                                          title="Send WhatsApp Room Pass"
                                        >
                                          <MessageSquare size={11} /> Pass
                                        </button>
                                        <button 
                                          className="btn btn-outline" 
                                          style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem', color: 'var(--danger)', borderColor: 'var(--border)' }}
                                          onClick={() => handleReassignRoom(occ.id, '')}
                                          title="Unassign from Room"
                                        >
                                          <X size={11} />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>

                          {/* Footer with Edit / Delete */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid var(--border)', fontSize: '0.75rem' }}>
                            <span style={{ color: 'var(--text-muted)' }}>
                              Extra mattress: ₹{room.extraMattressCost || 500}
                            </span>
                            <div style={{ display: 'flex', gap: '0.35rem' }}>
                              <button 
                                className="btn btn-outline" 
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                onClick={() => {
                                  setEditingRoomId(room.id);
                                  setNewRoom({ ...room });
                                  setIsAddRoomOpen(true);
                                }}
                              >
                                <Edit2 size={12} /> Edit
                              </button>
                              <button 
                                className="btn btn-outline" 
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: 'var(--danger)' }}
                                onClick={() => handleDeleteRoom(room.id)}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Unallocated Devotees for Room */}
                {(() => {
                  const unallocated = participants.filter(p => !p.roomId && (p.status === 'confirmed' || p.status === 'interested'));
                  if (unallocated.length === 0) return null;
                  return (
                    <div className="card" style={{ marginTop: '2rem', border: '1.5px dashed var(--warning)', backgroundColor: 'var(--warning-light)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <AlertTriangle size={18} color="var(--warning)" />
                        <h4 style={{ margin: 0, color: 'var(--warning)' }}>Unallocated Devotees ({unallocated.length} Groups)</h4>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text)', marginBottom: '1rem' }}>
                        The following devotees need a room assignment. Select a room to assign them manually or click 'Auto-Allocate Rooms'.
                      </p>
                      <div className="table-container" style={{ margin: 0 }}>
                        <table style={{ fontSize: '0.85rem', backgroundColor: 'var(--card-bg)' }}>
                          <thead>
                            <tr>
                              <th>Devotee Name</th>
                              <th>Group Size</th>
                              <th>Type</th>
                              <th>Assign to Room</th>
                            </tr>
                          </thead>
                          <tbody>
                            {unallocated.map(devotee => {
                              const devoteePax = (devotee.familyMembers && devotee.familyMembers.length) || devotee.membersCount || 1;
                              return (
                                <tr key={devotee.id}>
                                  <td><strong>{devotee.name}</strong> ({devotee.phone})</td>
                                  <td><span className="badge">{devoteePax} Person(s)</span></td>
                                  <td style={{ textTransform: 'capitalize' }}>{devotee.type}</td>
                                  <td>
                                    <select 
                                      className="form-control" 
                                      style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                                      value=""
                                      onChange={(e) => handleReassignRoom(devotee.id, e.target.value)}
                                    >
                                      <option value="" disabled>-- Assign Room --</option>
                                      {rooms.map(r => (
                                        <option key={r.id} value={r.id}>Room {r.roomNumber} ({r.roomType}, {r.capacity} beds)</option>
                                      ))}
                                    </select>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
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
            {activeTab === 'participants' && (() => {
              // Apply search filter and status/payment filters
              const baseFiltered = filterList(participants, ['name', 'phone', 'email', 'location', 'familyName', 'memberDetails']);
              const displayedParticipants = baseFiltered.filter(p => {
                const split = expCalc.splits.find(s => s.id === p.id);
                const devStatus = (split?.dynamicPaymentStatus === 'completed' && p.status === 'interested') ? 'confirmed' : (split?.dynamicDevoteeStatus || p.status);
                const payStatus = split?.dynamicPaymentStatus || p.paymentStatus;
                
                if (participantFilter === 'confirmed') return devStatus === 'confirmed';
                if (participantFilter === 'interested') return devStatus === 'interested';
                if (participantFilter === 'partially_paid') return payStatus === 'partially_paid';
                if (participantFilter === 'completed') return payStatus === 'completed';
                return true; // 'all'
              });

              return (
                <div>
                  {/* STAGE AWARENESS BANNER */}
                  {selectedYatra.status === 'confirmed' && (
                    <div style={{ backgroundColor: 'var(--success-light)', border: '1px solid var(--success-border)', borderRadius: 'var(--radius-sm)', padding: '0.65rem 1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', fontSize: '0.84rem', color: 'var(--success)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <CheckCircle size={18} style={{ flexShrink: 0 }} />
                        <span><strong>Yatra Confirmed (Public Link Closed):</strong> Public self-registration is locked. As an Admin, you retain the superpower to manually add individual devotees using the <strong>"+ Register Devotee"</strong> button below.</span>
                      </div>
                    </div>
                  )}
                  {selectedYatra.status === 'planning' && (
                    <div style={{ backgroundColor: '#fef3c7', border: '1px solid #fde68a', borderRadius: 'var(--radius-sm)', padding: '0.65rem 1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', fontSize: '0.84rem', color: '#b45309' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Clock size={18} style={{ flexShrink: 0 }} />
                        <span><strong>Planning Stage:</strong> Public registration is not yet open. You can input essentials and manually register core devotees below. Switch status to 'Registration Open' when ready.</span>
                      </div>
                    </div>
                  )}
                  {selectedYatra.status === 'completed' && (
                    <div style={{ backgroundColor: '#f1f5f9', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.65rem 1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', fontSize: '0.84rem', color: '#475569' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Compass size={18} style={{ flexShrink: 0 }} />
                        <span><strong>Yatra Completed:</strong> All accounts settled. You can review devotee records, export Excel data, or view photo memories.</span>
                      </div>
                    </div>
                  )}

                  {/* TOP TOOLBAR: COUNTS, FILTERS, VIEW TOGGLE & REGISTER */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                    {/* Filter Pills */}
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-muted)', marginRight: '0.25rem' }}>Filter:</span>
                      <button 
                        className={`btn ${participantFilter === 'all' ? 'btn-primary' : 'btn-outline'}`}
                        style={{ padding: '0.3rem 0.65rem', fontSize: '0.8rem' }}
                        onClick={() => setParticipantFilter('all')}
                      >
                        All ({participants.length})
                      </button>
                      <button 
                        className={`btn ${participantFilter === 'confirmed' ? 'btn-primary' : 'btn-outline'}`}
                        style={{ padding: '0.3rem 0.65rem', fontSize: '0.8rem' }}
                        onClick={() => setParticipantFilter('confirmed')}
                      >
                        Confirmed ({participants.filter(p => (expCalc.splits.find(s => s.id === p.id)?.dynamicDevoteeStatus || p.status) === 'confirmed').length})
                      </button>
                      <button 
                        className={`btn ${participantFilter === 'interested' ? 'btn-primary' : 'btn-outline'}`}
                        style={{ padding: '0.3rem 0.65rem', fontSize: '0.8rem' }}
                        onClick={() => setParticipantFilter('interested')}
                      >
                        Interested ({participants.filter(p => (expCalc.splits.find(s => s.id === p.id)?.dynamicDevoteeStatus || p.status) === 'interested').length})
                      </button>
                      <button 
                        className={`btn ${participantFilter === 'partially_paid' ? 'btn-primary' : 'btn-outline'}`}
                        style={{ padding: '0.3rem 0.65rem', fontSize: '0.8rem' }}
                        onClick={() => setParticipantFilter('partially_paid')}
                      >
                        Partially Paid ({expCalc.splits.filter(s => s.dynamicPaymentStatus === 'partially_paid').length})
                      </button>
                      <button 
                        className={`btn ${participantFilter === 'completed' ? 'btn-primary' : 'btn-outline'}`}
                        style={{ padding: '0.3rem 0.65rem', fontSize: '0.8rem' }}
                        onClick={() => setParticipantFilter('completed')}
                      >
                        Fully Paid ({expCalc.splits.filter(s => s.dynamicPaymentStatus === 'completed').length})
                      </button>
                    </div>

                    {/* View Switcher & Register Button */}
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <div style={{ display: 'flex', backgroundColor: 'var(--bg)', borderRadius: 'var(--radius-sm)', padding: '0.2rem', border: '1px solid var(--border)' }}>
                        <button 
                          className={`btn ${participantViewMode === 'table' ? 'btn-primary' : ''}`}
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', background: participantViewMode === 'table' ? '' : 'none', color: participantViewMode === 'table' ? '' : 'var(--text-muted)' }}
                          onClick={() => setParticipantViewMode('table')}
                          title="Compact Table View"
                        >
                          📋 Table
                        </button>
                        <button 
                          className={`btn ${participantViewMode === 'cards' ? 'btn-primary' : ''}`}
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', background: participantViewMode === 'cards' ? '' : 'none', color: participantViewMode === 'cards' ? '' : 'var(--text-muted)' }}
                          onClick={() => setParticipantViewMode('cards')}
                          title="Grid Cards View"
                        >
                          🗂️ Cards
                        </button>
                      </div>

                      <button className="btn btn-primary" onClick={() => setIsAddParticipantOpen(true)}>
                        <Plus size={16} /> Register Devotee
                      </button>
                    </div>
                  </div>

                  {/* VIEW 1: CLEAN & SPACIOUS TABLE WITH EXPANDABLE ROW */}
                  {participantViewMode === 'table' && (
                    <div className="table-container">
                      <table style={{ borderCollapse: 'separate', borderSpacing: '0 0.4rem' }}>
                        <thead>
                          <tr>
                            <th style={{ width: '22%' }}>Devotee</th>
                            <th style={{ width: '16%' }}>Group / Seats</th>
                            <th style={{ width: '14%' }}>Travel</th>
                            <th style={{ width: '10%' }}>Status</th>
                            <th style={{ width: '14%' }}>Yatra Fee</th>
                            <th style={{ width: '14%' }}>Payment</th>
                            <th style={{ width: '10%', textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayedParticipants.map(part => {
                            const splitInfo = expCalc.splits.find(s => s.id === part.id);
                            const dynamicPaymentStatus = splitInfo?.dynamicPaymentStatus || part.paymentStatus;
                            const effectiveDevoteeStatus = (dynamicPaymentStatus === 'completed' && part.status === 'interested') ? 'confirmed' : (splitInfo?.dynamicDevoteeStatus || part.status);
                            const isExpanded = expandedParticipantId === part.id;
                            const billable = splitInfo ? splitInfo.billableCount : 1;
                            const computedShare = splitInfo ? splitInfo.share : 0;
                            const isCustom = part.customPrice && parseFloat(part.customPrice) > 0;
                            const totalSeats = part.type === 'family' ? (part.membersCount || part.familyMembers?.length || 1) : 1;

                            return (
                              <React.Fragment key={part.id}>
                                <tr style={{ backgroundColor: isExpanded ? 'var(--bg)' : 'var(--card-bg)', transition: 'background-color 0.2s ease', borderLeft: isExpanded ? '4px solid var(--primary)' : '1px solid var(--border)' }}>
                                  {/* Devotee Primary Info */}
                                  <td>
                                    <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: 'var(--text)' }}>{part.name}</div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                                      📞 {part.phone}
                                    </div>
                                    {part.location && (
                                      <span style={{ fontSize: '0.7rem', backgroundColor: 'var(--bg)', border: '1px solid var(--border)', padding: '0.1rem 0.35rem', borderRadius: '3px', display: 'inline-block', marginTop: '0.2rem' }}>
                                        📍 {part.location}
                                      </span>
                                    )}
                                  </td>

                                  {/* Group / Seats */}
                                  <td>
                                    <span style={{ fontWeight: '600', fontSize: '0.85rem' }}>
                                      {part.type === 'family' ? `👨‍👩‍👧‍👦 ${part.familyName || 'Family'}` : '👤 Individual'}
                                    </span>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                                      {totalSeats} seat{totalSeats === 1 ? '' : 's'} {part.type === 'family' && billable < totalSeats ? `(${totalSeats - billable} free <5)` : ''}
                                    </div>
                                  </td>

                                  {/* Travel */}
                                  <td>
                                    <span className="badge" style={{ backgroundColor: part.travelMode === 'organised' ? 'var(--primary-light)' : 'var(--bg)', color: part.travelMode === 'organised' ? 'var(--primary)' : 'var(--text)', border: '1px solid var(--border)', textTransform: 'capitalize' }}>
                                      {part.travelMode === 'organised' ? '🚌 Organised' : `🚗 Self (${part.travelType || 'Direct'})`}
                                    </span>
                                    {part.travelType === 'rail' && (part.boardingStation || part.droppingStation) && (
                                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                        🚉 {part.droppingStation || part.boardingStation}
                                      </div>
                                    )}
                                  </td>

                                  {/* Devotee Status */}
                                  <td>
                                    <button 
                                      className={`badge badge-${effectiveDevoteeStatus}`} 
                                      style={{ cursor: 'pointer', border: 'none' }} 
                                      onClick={() => cycleParticipantStatus(part.id, effectiveDevoteeStatus)}
                                      title="Click to cycle status"
                                    >
                                      {effectiveDevoteeStatus}
                                    </button>
                                  </td>

                                  {/* Yatra Amount */}
                                  <td>
                                    <div style={{ fontWeight: 'bold', fontSize: '1rem', color: 'var(--text)' }}>
                                      ₹{Math.round(computedShare).toLocaleString()}
                                    </div>
                                    {isCustom ? (
                                      <span style={{ fontSize: '0.68rem', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', padding: '0.1rem 0.35rem', borderRadius: '3px' }}>✏️ Custom</span>
                                    ) : (
                                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                        {billable} × ₹{parseFloat(selectedYatra.pricePerPerson || 0).toLocaleString()}
                                      </div>
                                    )}
                                  </td>

                                  {/* Payment Status */}
                                  <td>
                                    <span className="badge" style={{ backgroundColor: dynamicPaymentStatus === 'completed' ? 'var(--success-light)' : (dynamicPaymentStatus === 'partially_paid' ? 'var(--primary-light)' : 'var(--warning-light)'), color: dynamicPaymentStatus === 'completed' ? 'var(--success)' : (dynamicPaymentStatus === 'partially_paid' ? 'var(--primary)' : 'var(--warning)') }}>
                                      {dynamicPaymentStatus.replace('_', ' ')}
                                    </span>
                                    {dynamicPaymentStatus === 'partially_paid' && splitInfo && (
                                      <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', lineHeight: '1.3' }}>
                                        <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>Paid: ₹{splitInfo.paid.toLocaleString()}</span><br />
                                        <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>Due: ₹{splitInfo.balance.toLocaleString()}</span>
                                      </div>
                                    )}
                                    {dynamicPaymentStatus === 'completed' && splitInfo && (
                                      <div style={{ marginTop: '0.15rem', fontSize: '0.72rem', color: 'var(--success)', fontWeight: '600' }}>
                                        ✓ Full Paid
                                      </div>
                                    )}
                                  </td>

                                  {/* Row Actions */}
                                  <td style={{ textAlign: 'right' }}>
                                    <div style={{ display: 'inline-flex', gap: '0.35rem', alignItems: 'center' }}>
                                      <button 
                                        className={`btn ${isExpanded ? 'btn-primary' : 'btn-outline'}`}
                                        style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
                                        onClick={() => setExpandedParticipantId(isExpanded ? null : part.id)}
                                        title={isExpanded ? "Collapse Details" : "View Full Details"}
                                      >
                                        {isExpanded ? '▲ Close' : '👁️ Details'}
                                      </button>

                                      <button 
                                        className="btn btn-outline" 
                                        style={{ padding: '0.3rem 0.45rem', fontSize: '0.75rem' }}
                                        onClick={() => sendWhatsApp(part, dynamicPaymentStatus === 'completed' ? 'payment_verified' : 'payment_reminder')}
                                        title="Send WhatsApp Message"
                                      >
                                        💬
                                      </button>

                                      <button 
                                        className="btn btn-danger btn-icon" 
                                        style={{ padding: '0.3rem' }}
                                        onClick={() => {
                                          if (window.confirm(`Delete devotee registration for ${part.name}?`)) {
                                            db.deleteParticipant(part.id).then(() => setRefreshTrigger(prev => prev + 1));
                                          }
                                        }}
                                        title="Delete Participant"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>

                                {/* EXPANDED DETAILS DRAWER SUB-ROW */}
                                {isExpanded && (
                                  <tr style={{ backgroundColor: 'var(--bg)' }}>
                                    <td colSpan={7} style={{ padding: '1rem 1.25rem', borderTop: 'none', borderBottom: '2px solid var(--border)' }}>
                                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '1.5rem', backgroundColor: 'var(--card-bg)', padding: '1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                                        {/* SECTION A: FAMILY MEMBERS ROSTER */}
                                        <div>
                                          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: 'var(--text)' }}>
                                            👨‍👩‍👧‍👦 Family Members ({totalSeats})
                                          </h4>
                                          {part.familyMembers && part.familyMembers.length > 0 ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                              {part.familyMembers.map((m, idx) => (
                                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0.5rem', backgroundColor: 'var(--bg)', borderRadius: '4px', fontSize: '0.8rem' }}>
                                                  <span>
                                                    <strong>{idx + 1}. {m.name || 'Unnamed'}</strong> ({m.relation || 'Relation N/A'})
                                                  </span>
                                                  <span>
                                                    {m.age ? `${m.age} yrs` : 'Age N/A'}
                                                    {m.age && parseInt(m.age) < 5 ? (
                                                      <span style={{ color: 'var(--success)', fontWeight: 'bold', marginLeft: '0.35rem' }}>🆓 FREE</span>
                                                    ) : ''}
                                                  </span>
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                              👤 Individual Registration: <strong>{part.name}</strong> (Self)
                                              {part.memberDetails && <p style={{ marginTop: '0.35rem' }}>Notes: {part.memberDetails}</p>}
                                            </div>
                                          )}
                                        </div>

                                        {/* SECTION B: TRAVEL & LOGISTICS */}
                                        <div>
                                          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: 'var(--text)' }}>
                                            🚗 Travel Logistics
                                          </h4>
                                          <div style={{ fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                            <div><strong>Mode:</strong> <span style={{ textTransform: 'capitalize' }}>{part.travelMode}</span></div>
                                            {part.travelMode === 'self' && <div><strong>Transport Type:</strong> <span style={{ textTransform: 'capitalize' }}>{part.travelType || 'Direct'}</span></div>}
                                            {part.boardingStation && <div><strong>Boarding Station:</strong> {part.boardingStation}</div>}
                                            {part.droppingStation && <div><strong>Dropping Station:</strong> {part.droppingStation}</div>}
                                            <div><strong>Email:</strong> {part.email || '—'}</div>
                                            {part.remarks && (
                                              <div style={{ marginTop: '0.35rem', padding: '0.4rem', backgroundColor: 'var(--bg)', borderRadius: '4px', fontSize: '0.78rem' }}>
                                                <strong>Remarks:</strong> {part.remarks}
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        {/* SECTION C: PRICE CUSTOMIZATION & QUICK ACTIONS */}
                                        <div>
                                          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: 'var(--text)' }}>
                                            💰 Custom Yatra Amount
                                          </h4>
                                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                            Admin superpower: Set custom total amount for this devotee/family.
                                          </p>
                                          
                                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                            <input 
                                              type="number"
                                              className="form-control"
                                              style={{ fontSize: '0.85rem', padding: '0.35rem 0.5rem', width: '120px' }}
                                              placeholder={`₹${Math.round(computedShare).toLocaleString()}`}
                                              defaultValue={part.customPrice || ''}
                                              onBlur={async (e) => {
                                                const val = e.target.value.trim();
                                                await db.updateParticipant(part.id, { customPrice: val || '' });
                                                setRefreshTrigger(prev => prev + 1);
                                              }}
                                              onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                                            />
                                            {part.customPrice && (
                                              <button 
                                                className="btn btn-outline"
                                                style={{ fontSize: '0.75rem', padding: '0.35rem 0.5rem' }}
                                                onClick={async () => {
                                                  await db.updateParticipant(part.id, { customPrice: '' });
                                                  setRefreshTrigger(prev => prev + 1);
                                                }}
                                              >
                                                Reset to Default
                                              </button>
                                            )}
                                          </div>
                                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                            {isCustom ? "✓ Custom amount active" : "Auto-calculated default active"}
                                          </div>

                                          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                            <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.3rem 0.5rem', color: '#047857' }} onClick={() => sendWhatsApp(part, 'welcome')}>
                                              💬 Welcome WhatsApp
                                            </button>
                                            <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.3rem 0.5rem', color: '#b45309' }} onClick={() => sendWhatsApp(part, 'payment_reminder')}>
                                              💰 Payment Reminder
                                            </button>
                                            <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.3rem 0.5rem', color: '#1d4ed8' }} onClick={() => sendWhatsApp(part, 'payment_verified')}>
                                              ✅ Confirmation WhatsApp
                                            </button>
                                            <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.3rem 0.5rem', color: '#4338ca' }} onClick={() => sendWhatsApp(part, 'itinerary_update')}>
                                              📢 Itinerary Update
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* VIEW 2: BEAUTIFUL RESPONSIVE CARDS GRID */}
                  {participantViewMode === 'cards' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
                      {displayedParticipants.map(part => {
                        const splitInfo = expCalc.splits.find(s => s.id === part.id);
                        const dynamicPaymentStatus = splitInfo?.dynamicPaymentStatus || part.paymentStatus;
                        const effectiveDevoteeStatus = (dynamicPaymentStatus === 'completed' && part.status === 'interested') ? 'confirmed' : (splitInfo?.dynamicDevoteeStatus || part.status);
                        const totalSeats = part.type === 'family' ? (part.membersCount || part.familyMembers?.length || 1) : 1;
                        const computedShare = splitInfo ? splitInfo.share : 0;
                        const paid = splitInfo ? splitInfo.paid : 0;
                        const balance = splitInfo ? splitInfo.balance : 0;

                        return (
                          <div key={part.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '1.25rem' }}>
                            <div>
                              {/* Header: Name & Status */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                <div>
                                  <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text)' }}>{part.name}</h4>
                                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>📞 {part.phone} {part.location ? `• ${part.location}` : ''}</span>
                                </div>
                                <button 
                                  className={`badge badge-${effectiveDevoteeStatus}`} 
                                  style={{ cursor: 'pointer', border: 'none' }} 
                                  onClick={() => cycleParticipantStatus(part.id, effectiveDevoteeStatus)}
                                >
                                  {effectiveDevoteeStatus}
                                </button>
                              </div>

                              {/* Group / Seats Badge */}
                              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.75rem', backgroundColor: 'var(--bg)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }}>
                                  {part.type === 'family' ? `👨‍👩‍👧‍👦 ${part.familyName || 'Family'} (${totalSeats} seats)` : '👤 Individual'}
                                </span>
                                <span style={{ fontSize: '0.75rem', backgroundColor: 'var(--bg)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }}>
                                  {part.travelMode === 'organised' ? '🚌 Organised' : '🚗 Self Travel'}
                                </span>
                              </div>

                              {/* Family Members Preview */}
                              {part.type === 'family' && part.familyMembers && part.familyMembers.length > 0 && (
                                <div style={{ fontSize: '0.78rem', backgroundColor: 'var(--bg)', padding: '0.5rem 0.75rem', borderRadius: '4px', marginBottom: '0.75rem', color: 'var(--text-muted)' }}>
                                  <strong>Members:</strong> {part.familyMembers.map(m => m.name).filter(Boolean).join(', ')}
                                </div>
                              )}

                              {/* Financial Pill Box */}
                              <div style={{ backgroundColor: 'var(--primary-light)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '0.75rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Fee:</span>
                                  <span style={{ fontSize: '1.05rem', fontWeight: 'bold' }}>₹{Math.round(computedShare).toLocaleString()}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                                  <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>Paid: ₹{paid.toLocaleString()}</span>
                                  <span style={{ color: balance > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 'bold' }}>
                                    {balance > 0 ? `Due: ₹${balance.toLocaleString()}` : '✓ Fully Paid'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Card Footer Actions */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--border)', marginTop: '0.5rem' }}>
                              <span className="badge" style={{ backgroundColor: dynamicPaymentStatus === 'completed' ? 'var(--success-light)' : (dynamicPaymentStatus === 'partially_paid' ? 'var(--primary-light)' : 'var(--warning-light)'), color: dynamicPaymentStatus === 'completed' ? 'var(--success)' : (dynamicPaymentStatus === 'partially_paid' ? 'var(--primary)' : 'var(--warning)') }}>
                                {dynamicPaymentStatus.replace('_', ' ')}
                              </span>

                              <div style={{ display: 'flex', gap: '0.35rem' }}>
                                <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => sendWhatsApp(part, dynamicPaymentStatus === 'completed' ? 'payment_verified' : 'payment_reminder')}>
                                  WhatsApp
                                </button>
                                <button 
                                  className="btn btn-danger btn-icon" 
                                  style={{ padding: '0.25rem' }}
                                  onClick={() => {
                                    if (window.confirm(`Delete ${part.name}?`)) {
                                      db.deleteParticipant(part.id).then(() => setRefreshTrigger(prev => prev + 1));
                                    }
                                  }}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

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
                        <th>Amount</th>
                        <th>Method</th>
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
                            <td>
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                                backgroundColor: pay.paymentMethod === 'cash' ? 'var(--success-light)' : 'var(--primary-light)',
                                color: pay.paymentMethod === 'cash' ? 'var(--success)' : 'var(--primary)',
                                padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.78rem', fontWeight: '600', textTransform: 'uppercase'
                              }}>
                                {pay.paymentMethod === 'cash' ? '💵 Cash' : '📱 UPI'}
                              </span>
                            </td>
                            <td><code>{pay.transactionRef}</code></td>
                            <td>{pay.paymentDate}</td>
                            <td>
                              {pay.screenshotUrl ? (
                                <a href={pay.screenshotUrl} target="_blank" rel="noopener noreferrer">
                                  <img src={pay.screenshotUrl} alt="Receipt proof" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border)' }} />
                                </a>
                              ) : pay.paymentMethod === 'cash' ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', backgroundColor: 'var(--success-light)', color: 'var(--success)', padding: '0.25rem 0.6rem', borderRadius: '4px', fontSize: '0.78rem', fontWeight: '600' }}>
                                  💵 Cash Payment
                                </span>
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
                              <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                                {pay.status !== 'verified' ? (
                                  <button className="btn btn-outline" style={{ padding: '0.35rem 0.5rem', color: 'var(--success)', borderColor: 'var(--success-border)', backgroundColor: 'var(--success-light)' }} onClick={() => verifyPayment(pay.id, pay.participantId, 'verified')}>
                                    <Check size={14} /> Verify
                                  </button>
                                ) : (
                                  <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: '600' }}>✓ Verified</span>
                                )}
                                {partObj && partObj.phone && (
                                  <button
                                    className="btn btn-outline"
                                    style={{ padding: '0.35rem 0.5rem', color: '#16a34a', borderColor: '#86efac', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}
                                    onClick={() => sendWhatsApp(partObj, 'payment_verified', { amount: pay.amountPaid })}
                                    title="Send WhatsApp Confirmation Receipt"
                                  >
                                    <MessageSquare size={13} /> WhatsApp
                                  </button>
                                )}
                                {pay.status !== 'rejected' && (
                                  <button className="btn btn-outline" style={{ padding: '0.35rem 0.5rem', color: 'var(--danger)', borderColor: 'hsla(350,80%,55%,0.2)', backgroundColor: 'var(--danger-light)' }} onClick={() => verifyPayment(pay.id, pay.participantId, 'rejected')}>
                                    <X size={14} /> Reject
                                  </button>
                                )}
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

                {/* CHECKLIST - Upgraded To-Do List */}
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3>Yatra Organizer To-Do List</h3>
                    <button className="btn btn-primary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} onClick={() => setIsAddTaskOpen(!isAddTaskOpen)}>
                      <Plus size={14} /> Add Task
                    </button>
                  </div>

                  {/* Add Task Form */}
                  {isAddTaskOpen && (
                    <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'var(--bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: '600' }}>Task Name *</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. Book hotel, Collect passports..."
                          value={newTaskForm.text}
                          onChange={(e) => setNewTaskForm(f => ({ ...f, text: e.target.value }))}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: '600' }}>Details / Notes</label>
                        <textarea
                          className="form-control"
                          rows={2}
                          placeholder="Any additional information or sub-tasks..."
                          value={newTaskForm.details}
                          onChange={(e) => setNewTaskForm(f => ({ ...f, details: e.target.value }))}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: '600' }}>Target Date</label>
                        <input
                          type="date"
                          className="form-control"
                          value={newTaskForm.date}
                          onChange={(e) => setNewTaskForm(f => ({ ...f, date: e.target.value }))}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-primary" style={{ flex: 1 }} onClick={async () => {
                          if (!newTaskForm.text.trim()) return;
                          const current = JSON.parse(notes.content);
                          current.checklist.push({
                            id: 'chk_' + Math.random().toString(36).substring(2, 9),
                            text: newTaskForm.text.trim(),
                            details: newTaskForm.details.trim(),
                            date: newTaskForm.date,
                            checked: false,
                            createdAt: new Date().toISOString().split('T')[0]
                          });
                          const updatedNotes = await db.updateNotes(notes.id, { content: JSON.stringify(current) });
                          setNotes(updatedNotes);
                          setNewTaskForm({ text: '', details: '', date: '' });
                          setIsAddTaskOpen(false);
                        }}>
                          <Check size={14} /> Save Task
                        </button>
                        <button className="btn btn-outline" onClick={() => { setIsAddTaskOpen(false); setNewTaskForm({ text: '', details: '', date: '' }); }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Tasks List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                    {JSON.parse(notes.content).checklist.length === 0 && (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1.5rem 0' }}>No tasks yet. Click "Add Task" to create your first to-do item.</p>
                    )}
                    {JSON.parse(notes.content).checklist.map(item => (
                      <div key={item.id} style={{
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border)',
                        backgroundColor: item.checked ? 'var(--bg)' : 'var(--card-bg)',
                        opacity: item.checked ? 0.65 : 1,
                        transition: 'all 0.2s ease'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                          <label className="checkbox-group" style={{ flex: 1, alignItems: 'flex-start' }}>
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
                              style={{ marginTop: '0.15rem' }}
                            />
                            <div>
                              <span style={{
                                fontWeight: '600',
                                textDecoration: item.checked ? 'line-through' : 'none',
                                color: item.checked ? 'var(--text-muted)' : 'var(--text)',
                                fontSize: '0.9rem'
                              }}>
                                {item.text}
                              </span>
                              {item.details && (
                                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.2rem 0 0', lineHeight: '1.4' }}>
                                  {item.details}
                                </p>
                              )}
                              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                                {item.date && (
                                  <span style={{ fontSize: '0.72rem', color: new Date(item.date) < new Date() && !item.checked ? 'var(--danger)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                    📅 {new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    {new Date(item.date) < new Date() && !item.checked && <span style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '700' }}>OVERDUE</span>}
                                  </span>
                                )}
                                {item.createdAt && (
                                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Added: {item.createdAt}</span>
                                )}
                              </div>
                            </div>
                          </label>
                          <button className="btn btn-danger btn-icon" style={{ padding: '0.25rem', flexShrink: 0 }} onClick={async () => {
                            if (window.confirm('Delete this task?')) {
                              const current = JSON.parse(notes.content);
                              current.checklist = current.checklist.filter(i => i.id !== item.id);
                              const updatedNotes = await db.updateNotes(notes.id, { content: JSON.stringify(current) });
                              setNotes(updatedNotes);
                            }
                          }}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
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
                  <button className="btn btn-outline" onClick={() => exportParticipantCSV()}>
                    <FileDown size={16} /> Export Participant CSV (Detailed)
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

              {/* STAGE 1: PLANNING (Registration link not active) */}
              {selectedYatra.status === 'planning' ? (
                <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                  <div style={{ backgroundColor: '#fef3c7', color: '#b45309', width: '3.75rem', height: '3.75rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                    <Clock size={30} />
                  </div>
                  <h3>Registrations Not Yet Open</h3>
                  <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', lineHeight: '1.5' }}>
                    <strong>{selectedYatra.name}</strong> is currently in the <strong>Planning stage</strong>.
                  </p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                    The organizers are finalizing hotels, travel arrangements, and budgeting. Public registration will open as soon as planning is complete!
                  </p>
                  <button className="btn btn-outline" style={{ marginTop: '1.5rem' }} onClick={() => navigateTo('home')}>
                    Back to Yatras
                  </button>
                </div>
              ) : selectedYatra.status === 'confirmed' ? (
                /* STAGE 3: CONFIRMED (No more public registrations accepted; only Admin can register devotees manually) */
                <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                  <div style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)', width: '3.75rem', height: '3.75rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                    <CheckCircle size={30} />
                  </div>
                  <h3>Yatra Confirmed — Public Registration Closed</h3>
                  <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', lineHeight: '1.5' }}>
                    <strong>{selectedYatra.name}</strong> is officially <strong>Confirmed</strong>! Public registration is now closed as hotel rooms and travel arrangements have been locked.
                  </p>
                  <div style={{ backgroundColor: 'var(--bg)', padding: '1rem', borderRadius: 'var(--radius-sm)', margin: '1.25rem 0', border: '1px solid var(--border)', fontSize: '0.85rem', color: 'var(--text-main)', textAlign: 'left' }}>
                    <strong>Want to join or add an extra family member?</strong><br />
                    Please contact the Yatra Organizer directly. Organizers retain the authority to register individual devotees manually if any seats become available.
                  </div>
                  <button className="btn btn-primary" style={{ marginTop: '0.5rem' }} onClick={() => navigateTo('login')}>
                    Registered Devotee Login
                  </button>
                </div>
              ) : selectedYatra.status === 'completed' ? (
                /* STAGE 4: COMPLETED (Yatra ended, all settled) */
                <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                  <div style={{ backgroundColor: '#f1f5f9', color: '#64748b', width: '3.75rem', height: '3.75rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                    <Compass size={30} />
                  </div>
                  <h3>Yatra Successfully Concluded</h3>
                  <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', lineHeight: '1.5' }}>
                    <strong>{selectedYatra.name}</strong> has successfully concluded. All bookings and financial accounts are settled.
                  </p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                    Haribol! Thank you to all participants for being part of this sacred journey.
                  </p>
                  <button className="btn btn-outline" style={{ marginTop: '1.5rem' }} onClick={() => navigateTo('login')}>
                    Devotee Portal Login (View Photos)
                  </button>
                </div>
              ) : (selectedYatra.registrationDeadline && new Date() > new Date(selectedYatra.registrationDeadline)) ? (
                /* EXPIRED DEADLINE */
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
                  {/* Returning Devotee Auto-Fill Banner */}
                  {autoFilledDevotee && (
                    <div style={{
                      backgroundColor: 'hsla(142, 72%, 96%, 1)',
                      border: '1.5px solid #10b981',
                      borderRadius: 'var(--radius-sm)',
                      padding: '1rem 1.25rem',
                      marginBottom: '1.5rem',
                      display: 'flex',
                      gap: '0.85rem',
                      alignItems: 'flex-start',
                      boxShadow: '0 2px 6px rgba(16,185,129,0.12)'
                    }}>
                      <Sparkles size={24} style={{ color: '#059669', flexShrink: 0, marginTop: '2px' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '700', color: '#065f46', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span>Welcome back, {autoFilledDevotee.name}! 🙏</span>
                          {autoFilledDevotee.familyName && (
                            <span style={{ fontSize: '0.8rem', backgroundColor: '#d1fae5', color: '#047857', padding: '0.15rem 0.5rem', borderRadius: '1rem', fontWeight: 600 }}>
                              {autoFilledDevotee.familyName}
                            </span>
                          )}
                        </div>
                        <p style={{ margin: '0.35rem 0 0.5rem 0', fontSize: '0.85rem', color: '#047857', lineHeight: '1.45' }}>
                          We identified your saved devotee profile from your previous Yatra! Your contact info and <strong>{autoFilledDevotee.familyMembers?.length || 1} family member(s)</strong> have been auto-populated below. You can review, add new members, remove members, or update anything as needed.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setAutoFilledDevotee(null);
                            setNewParticipant({
                              name: '', phone: newParticipant.phone, email: '', location: '',
                              type: 'individual', familyName: '', membersCount: 1, familyMembers: [],
                              memberDetails: '', travelMode: 'organised', travelType: '',
                              boardingStation: '', droppingStation: '', remarks: '',
                              status: 'interested', paymentStatus: 'pending'
                            });
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#b91c1c',
                            fontSize: '0.8rem',
                            textDecoration: 'underline',
                            cursor: 'pointer',
                            padding: 0,
                            fontWeight: '600'
                          }}
                        >
                          Not you? Click here to clear and start fresh
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid-cols-2">
                    <div className="form-group">
                      <label>Mobile Number (WhatsApp Preferred)</label>
                      <input
                        type="tel"
                        required
                        className="form-control"
                        placeholder="9876543210"
                        value={newParticipant.phone}
                        onChange={(e) => handleDevoteePhoneChange(e.target.value, false)}
                        onBlur={() => handleDevoteePhoneChange(newParticipant.phone, false)}
                      />
                      <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                        💡 Returning devotee? Type your 10-digit number to auto-load your family!
                      </small>
                    </div>
                    <div className="form-group">
                      <label>Devotee Name</label>
                      <input
                        type="text"
                        required
                        className="form-control"
                        placeholder="Ramesh Sharma"
                        value={newParticipant.name}
                        onChange={(e) => setNewParticipant({...newParticipant, name: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid-cols-2">
                    <div className="form-group">
                      <label>Email Address <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 'normal' }}>(Optional)</span></label>
                      <input type="email" className="form-control" placeholder="ramesh@gmail.com (Optional)" value={newParticipant.email} onChange={(e) => setNewParticipant({...newParticipant, email: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label>Location (City/State)</label>
                      <input type="text" required className="form-control" placeholder="Mumbai" value={newParticipant.location} onChange={(e) => setNewParticipant({...newParticipant, location: e.target.value})} />
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
                    <div style={{ backgroundColor: 'var(--bg)', padding: '1.25rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', border: '1px solid var(--border)' }}>
                      <div className="form-group">
                        <label>Family Name / Title</label>
                        <input type="text" className="form-control" placeholder="Sharma Family" value={newParticipant.familyName} onChange={(e) => setNewParticipant({...newParticipant, familyName: e.target.value})} />
                      </div>

                      {/* Important Warning Banner */}
                      <div style={{ backgroundColor: 'var(--warning-light)', color: 'var(--warning)', border: '1px solid hsla(38,92%,50%,0.3)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                        <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>
                          <strong>Important: Please include YOURSELF in the member list below!</strong><br />
                          The primary devotee is <em>not</em> automatically counted as a seat. Please add yourself (with Relation: <strong>"Self"</strong>) and all accompanying family members so that your total seat count and charges are calculated accurately.
                        </div>
                      </div>

                      {/* Quick Add Myself Button if not yet added */}
                      {!(newParticipant.familyMembers || []).some(m => m.relation === 'Self') && (
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{ marginBottom: '1rem', fontSize: '0.82rem', padding: '0.4rem 0.75rem', borderColor: 'var(--primary)', color: 'var(--primary)', width: '100%', backgroundColor: 'var(--primary-light)', fontWeight: '600' }}
                          onClick={() => {
                            const selfMember = { name: newParticipant.name || '', relation: 'Self', age: '', phone: newParticipant.phone || '' };
                            const current = newParticipant.familyMembers || [];
                            const updated = [selfMember, ...current];
                            setNewParticipant({ ...newParticipant, familyMembers: updated, membersCount: updated.length });
                          }}
                        >
                          👤 Click to Add Yourself ({newParticipant.name || 'Primary Devotee'}) as 1st Member
                        </button>
                      )}

                      <div style={{ marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <label style={{ fontWeight: '600', fontSize: '0.9rem', margin: 0 }}>Family Members List</label>
                          <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 'bold' }}>
                            {newParticipant.familyMembers?.length || 0} Member{(newParticipant.familyMembers?.length || 0) === 1 ? '' : 's'} Added
                          </span>
                        </div>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Children under 5 years are exempt from yatra fees (Free seat).</p>
                        
                        {(newParticipant.familyMembers || []).map((member, idx) => (
                          <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem', padding: '0.5rem', backgroundColor: 'var(--card-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                            <div style={{ flex: 2 }}>
                              <input type="text" required className="form-control" placeholder="Full Name" value={member.name} onChange={(e) => {
                                const updated = [...newParticipant.familyMembers];
                                updated[idx] = { ...updated[idx], name: e.target.value };
                                setNewParticipant({...newParticipant, familyMembers: updated});
                              }} style={{ fontSize: '0.85rem', padding: '0.4rem' }} />
                            </div>
                            <div style={{ flex: 1.2 }}>
                              <select className="form-control" value={member.relation} onChange={(e) => {
                                const updated = [...newParticipant.familyMembers];
                                updated[idx] = { ...updated[idx], relation: e.target.value };
                                setNewParticipant({...newParticipant, familyMembers: updated});
                              }} style={{ fontSize: '0.85rem', padding: '0.4rem' }}>
                                <option value="">Relation</option>
                                <option value="Self">Self</option>
                                <option value="Spouse">Spouse</option>
                                <option value="Son">Son</option>
                                <option value="Daughter">Daughter</option>
                                <option value="Father">Father</option>
                                <option value="Mother">Mother</option>
                                <option value="Brother">Brother</option>
                                <option value="Sister">Sister</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>
                            <div style={{ width: '65px' }}>
                              <input type="number" className="form-control" placeholder="Age" min={0} max={120} value={member.age} onChange={(e) => {
                                const updated = [...newParticipant.familyMembers];
                                updated[idx] = { ...updated[idx], age: e.target.value };
                                setNewParticipant({...newParticipant, familyMembers: updated});
                              }} style={{ fontSize: '0.85rem', padding: '0.4rem' }} />
                            </div>
                            <div style={{ flex: 1.5 }}>
                              <input type="tel" className="form-control" placeholder="Phone No." value={member.phone} onChange={(e) => {
                                const updated = [...newParticipant.familyMembers];
                                updated[idx] = { ...updated[idx], phone: e.target.value };
                                setNewParticipant({...newParticipant, familyMembers: updated});
                              }} style={{ fontSize: '0.85rem', padding: '0.4rem' }} />
                            </div>
                            <button type="button" className="btn btn-danger btn-icon" style={{ padding: '0.3rem', flexShrink: 0 }} onClick={() => {
                              const updated = newParticipant.familyMembers.filter((_, i) => i !== idx);
                              setNewParticipant({...newParticipant, familyMembers: updated, membersCount: updated.length || 1});
                            }}>
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}

                        <button type="button" className="btn btn-outline" style={{ width: '100%', marginTop: '0.5rem', padding: '0.5rem', fontSize: '0.85rem' }} onClick={() => {
                          const updated = [...(newParticipant.familyMembers || []), { name: '', relation: '', age: '', phone: '' }];
                          setNewParticipant({...newParticipant, familyMembers: updated, membersCount: updated.length});
                        }}>
                          <Plus size={14} /> Add Another Family Member
                        </button>

                        {/* Confirmation Step & Summary */}
                        <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.85rem', marginTop: '1rem' }}>
                          <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--text)' }}>📋 Family Members Summary</h5>
                          {(!newParticipant.familyMembers || newParticipant.familyMembers.length === 0) ? (
                            <p style={{ color: 'var(--danger)', fontSize: '0.8rem', margin: 0 }}>⚠️ No members added yet. Please add all family members above.</p>
                          ) : (
                            <div>
                              <ul style={{ margin: '0 0 0.5rem 1.2rem', padding: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                {newParticipant.familyMembers.map((m, i) => (
                                  <li key={i} style={{ marginBottom: '0.2rem' }}>
                                    <strong>{m.name || 'Unnamed'}</strong> ({m.relation || 'Relation N/A'}{m.age ? `, ${m.age} yrs` : ''}) {m.age && parseInt(m.age) < 5 ? <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>— Free (Under 5)</span> : ''}
                                  </li>
                                ))}
                              </ul>
                              {selectedYatra?.pricePerPerson && (
                                <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '0.5rem' }}>
                                  Estimated Yatra Amount: ₹{(newParticipant.familyMembers.filter(m => !m.age || parseInt(m.age) >= 5).length * parseFloat(selectedYatra.pricePerPerson)).toLocaleString()}
                                </div>
                              )}
                              <label className="checkbox-group" style={{ cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', marginTop: '0.5rem' }}>
                                <input 
                                  type="checkbox" 
                                  required 
                                  checked={familyConfirmed} 
                                  onChange={(e) => setFamilyConfirmed(e.target.checked)} 
                                />
                                <span>I reconfirm that all family members (including myself) are listed above.</span>
                              </label>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid-cols-2">
                    <div className="form-group">
                      <label>Mode of Travel</label>
                      <select value={newParticipant.travelMode} onChange={(e) => setNewParticipant({...newParticipant, travelMode: e.target.value})}>
                        <option value="organised">As Organised</option>
                        <option value="self">Self Travel</option>
                      </select>
                    </div>
                    {newParticipant.travelMode === 'self' && (
                      <div className="form-group">
                        <label>Travel Type</label>
                        <select value={newParticipant.travelType} onChange={(e) => setNewParticipant({...newParticipant, travelType: e.target.value})}>
                          <option value="">Select Type...</option>
                          <option value="air">Air</option>
                          <option value="rail">Rail</option>
                          <option value="road">Road</option>
                        </select>
                      </div>
                    )}
                  </div>
                  
                  {newParticipant.travelMode === 'self' && newParticipant.travelType === 'rail' && (
                    <div className="grid-cols-2">
                      <div className="form-group">
                        <label>Boarding Station</label>
                        <input type="text" className="form-control" placeholder="Mumbai Central" value={newParticipant.boardingStation} onChange={(e) => setNewParticipant({...newParticipant, boardingStation: e.target.value})} />
                      </div>
                      <div className="form-group">
                        <label>Dropping Station</label>
                        <input type="text" className="form-control" placeholder="Mathura Jn" value={newParticipant.droppingStation} onChange={(e) => setNewParticipant({...newParticipant, droppingStation: e.target.value})} />
                      </div>
                    </div>
                  )}

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
              <h2>Yatra Payment</h2>
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
                  {/* Payment Method Toggle */}
                  <div style={{ display: 'flex', backgroundColor: 'var(--bg)', borderRadius: 'var(--radius-sm)', padding: '0.25rem', marginBottom: '1.5rem' }}>
                    <button
                      type="button"
                      className={`btn ${publicPayMethod === 'upi' ? 'btn-primary' : ''}`}
                      style={{ flex: 1, padding: '0.6rem', background: publicPayMethod === 'upi' ? '' : 'none', color: publicPayMethod === 'upi' ? '' : 'var(--text-muted)' }}
                      onClick={() => setPublicPayMethod('upi')}
                    >📱 Pay via UPI</button>
                    <button
                      type="button"
                      className={`btn ${publicPayMethod === 'cash' ? 'btn-primary' : ''}`}
                      style={{ flex: 1, padding: '0.6rem', background: publicPayMethod === 'cash' ? '' : 'none', color: publicPayMethod === 'cash' ? '' : 'var(--text-muted)' }}
                      onClick={() => setPublicPayMethod('cash')}
                    >💵 Pay by Cash</button>
                  </div>

                  {/* UPI QR SCANNER BOX - only for UPI */}
                  {publicPayMethod === 'upi' && (
                    <div style={{ backgroundColor: 'var(--bg)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px dashed var(--primary-border)', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <img 
                        src={selectedYatra.customQrImageUrl || getUPIQRCodeUrl(selectedYatra.upiId, selectedYatra.upiName, parseFloat(publicPayAmount) || 0, 'Yatra Payment')} 
                        alt="UPI QR Scanner" 
                        style={{ width: '220px', height: '220px', objectFit: 'contain', backgroundColor: 'white', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                      />
                      <div style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
                        <strong>UPI ID:</strong> <code>{selectedYatra.upiId}</code><br />
                        <strong>Account Name:</strong> {selectedYatra.upiName}
                      </div>
                    </div>
                  )}

                  {/* Cash payment info */}
                  {publicPayMethod === 'cash' && (
                    <div style={{ backgroundColor: 'var(--success-light)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', fontSize: '0.85rem', color: 'var(--success)', textAlign: 'left' }}>
                      <strong>💵 Cash Payment:</strong> Please hand over the cash amount to the Yatra organizer and enter the amount below. The organizer will verify and confirm your payment.
                    </div>
                  )}

                  {/* Exact Amount Calculation & Display */}
                  {(() => {
                    const pObj = paymentParticipant || participants.find(p => p.id === currentRoute.id);
                    const yPrice = selectedYatra.pricePerPerson ? parseFloat(selectedYatra.pricePerPerson) : 0;
                    
                    let billableCount = 1;
                    let freeCount = 0;
                    let totalFee = 0;
                    let isCustom = false;

                    if (pObj) {
                      if (pObj.type === 'family') {
                        if (pObj.familyMembers && pObj.familyMembers.length > 0) {
                          billableCount = pObj.familyMembers.filter(m => !m.age || parseInt(m.age) >= 5).length || 1;
                          freeCount = pObj.familyMembers.filter(m => m.age && parseInt(m.age) < 5).length;
                        } else {
                          billableCount = pObj.membersCount || 1;
                        }
                      } else {
                        billableCount = 1;
                      }

                      if (pObj.customPrice && parseFloat(pObj.customPrice) > 0) {
                        totalFee = parseFloat(pObj.customPrice);
                        isCustom = true;
                      } else if (yPrice > 0) {
                        totalFee = billableCount * yPrice;
                      }
                    } else if (yPrice > 0) {
                      totalFee = yPrice;
                    }

                    return (
                      <div style={{ backgroundColor: 'var(--primary-light)', border: '1px solid var(--primary-border)', padding: '1.25rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', textAlign: 'left' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '0.88rem', color: 'var(--text)' }}>
                            {pObj ? (
                              <>Devotee: <strong>{pObj.name}</strong> {pObj.type === 'family' ? `(${pObj.familyName || 'Family'})` : ''}</>
                            ) : <span>Yatra: <strong>{selectedYatra.name}</strong></span>}
                          </span>
                          <span style={{ fontSize: '0.75rem', backgroundColor: 'var(--card-bg)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border)', fontWeight: 'bold' }}>
                            {pObj?.type === 'family' ? `👨‍👩‍👧‍👦 ${pObj.membersCount || (billableCount + freeCount)} Seats` : '👤 1 Seat'}
                          </span>
                        </div>

                        {/* Breakdown text */}
                        {isCustom ? (
                          <div style={{ fontSize: '0.82rem', color: 'var(--primary)', fontWeight: '500', marginBottom: '0.4rem' }}>
                            ✏️ <em>Special Customized Yatra Fee approved by Organizer</em>
                          </div>
                        ) : yPrice > 0 ? (
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                            ₹{yPrice.toLocaleString()} per person × {billableCount} billable member{billableCount > 1 ? 's' : ''}
                            {freeCount > 0 && <span style={{ color: 'var(--success)', fontWeight: 'bold' }}> ({freeCount} child under 5 yrs is FREE)</span>}
                          </div>
                        ) : null}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.6rem', borderTop: '1px dashed hsla(210, 80%, 50%, 0.25)', marginTop: '0.3rem' }}>
                          <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: 'var(--text)' }}>Exact Amount to Pay:</span>
                          <span style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--primary)' }}>₹{totalFee.toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="form-group" style={{ textAlign: 'left' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                      <label style={{ margin: 0 }}>Amount to Submit (₹)</label>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Part payment accepted</span>
                    </div>
                    <input 
                      type="number" 
                      required 
                      className="form-control" 
                      placeholder="Enter payment amount" 
                      value={publicPayAmount} 
                      onChange={(e) => setPublicPayAmount(e.target.value)} 
                      style={{ fontSize: '1.15rem', fontWeight: 'bold', color: 'var(--primary)' }}
                    />
                  </div>

                  {/* UPI-only fields */}
                  {publicPayMethod === 'upi' && (
                    <>
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
                    </>
                  )}

                  {/* Cash-only: payment date */}
                  {publicPayMethod === 'cash' && (
                    <div className="form-group" style={{ textAlign: 'left' }}>
                      <label>Date of Cash Payment</label>
                      <input type="date" required className="form-control" value={publicPayDate} onChange={(e) => setPublicPayDate(e.target.value)} />
                    </div>
                  )}

                  <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', padding: '0.75rem' }}>
                    {publicPayMethod === 'cash' ? 'Submit Cash Payment' : 'Submit Payment Receipt'}
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
                {/* DEVOTEE PASSES: BUS ALLOCATION & HOTEL ROOM */}
                {(() => {
                  const currentDevotee = (participants && participants.find(p => p.id === myParticipantData.id)) || myParticipantData;
                  const myBus = buses.find(b => b.id === currentDevotee.busId);
                  const myRoom = rooms.find(r => r.id === currentDevotee.roomId);
                  const myHotel = hotels.find(h => h.name === (myRoom?.hotelName || currentDevotee.hotelName)) || hotels.find(h => h.finalSelected) || hotels[0];
                  const totalPax = (currentDevotee.familyMembers && currentDevotee.familyMembers.length) || currentDevotee.membersCount || 1;

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
                      {/* BUS TRAVEL PASS */}
                      {currentDevotee.travelMode === 'self' ? (
                        <div className="card" style={{ borderLeft: '4px solid #6366f1', backgroundColor: 'var(--bg)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ fontSize: '1.5rem' }}>🚗</span>
                            <div>
                              <h4 style={{ margin: 0 }}>Self-Arranged Travel Mode</h4>
                              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
                                You have opted to travel independently by {currentDevotee.travelType || 'your own vehicle / rail'}. Please ensure you reach the yatra destination on time!
                              </p>
                              {currentDevotee.boardingStation && (
                                <span style={{ fontSize: '0.8rem', color: 'var(--text)', display: 'inline-block', marginTop: '0.25rem' }}>
                                  Transit Route: {currentDevotee.boardingStation} ➔ {currentDevotee.droppingStation || selectedYatra.destination}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : myBus ? (
                        <div className="card" style={{ border: '2px solid var(--primary)', backgroundColor: 'var(--card-bg)', position: 'relative', overflow: 'hidden' }}>
                          <div style={{ position: 'absolute', top: 0, right: 0, backgroundColor: 'var(--primary)', color: 'white', padding: '0.25rem 0.85rem', borderBottomLeftRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Bus size={13} /> OFFICIAL BUS PASS
                          </div>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginTop: '0.5rem' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Bus size={24} />
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <h3 style={{ margin: 0, color: 'var(--primary)' }}>{myBus.name}</h3>
                                {myBus.busNumber && <span className="badge" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}>{myBus.busNumber}</span>}
                                <span className="badge badge-confirmed">{totalPax} Reserved Seat{totalPax > 1 ? 's' : ''}</span>
                              </div>
                              <p style={{ fontSize: '0.85rem', color: 'var(--text)', margin: '0.4rem 0' }}>
                                <strong>Route:</strong> {myBus.route || selectedYatra.destination}
                              </p>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', backgroundColor: 'var(--bg)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', marginTop: '0.5rem', fontSize: '0.85rem' }}>
                                <div>
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>BOARDING LOCATION</span>
                                  <strong>📍 {myBus.boardingPoint || 'Main Tour Assembly Point'}</strong>
                                </div>
                                <div>
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>DEPARTURE TIME</span>
                                  <strong>⏰ {myBus.departureTime || '06:00 AM (Day 1)'}</strong>
                                </div>
                                <div>
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>BUS COORDINATOR</span>
                                  <strong>👤 {myBus.coordinatorName || 'Organizer'}</strong>
                                  {myBus.coordinatorPhone && (
                                    <div style={{ fontSize: '0.8rem', marginTop: '0.15rem' }}>
                                      <a href={`tel:${myBus.coordinatorPhone}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>📞 {myBus.coordinatorPhone}</a>
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>DRIVER DETAILS</span>
                                  <strong>👨‍✈️ {myBus.driverName || 'Tour Driver'}</strong>
                                  {myBus.driverPhone && (
                                    <div style={{ fontSize: '0.8rem', marginTop: '0.15rem' }}>
                                      <a href={`tel:${myBus.driverPhone}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>📞 {myBus.driverPhone}</a>
                                    </div>
                                  )}
                                </div>
                              </div>
                              {currentDevotee.familyMembers && currentDevotee.familyMembers.length > 0 && (
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                  <strong>Seated with you:</strong> {currentDevotee.familyMembers.map(m => m.name).join(', ')}
                                </div>
                              )}
                              {myBus.notes && (
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.5rem 0 0', fontStyle: 'italic' }}>
                                  ℹ️ {myBus.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="card" style={{ borderLeft: '4px solid var(--warning)', backgroundColor: 'var(--warning-light)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Bus size={22} color="var(--warning)" />
                            <div>
                              <h4 style={{ margin: 0, color: 'var(--warning)' }}>Bus Seat Allocation in Progress</h4>
                              <p style={{ fontSize: '0.85rem', color: 'var(--text)', margin: '0.2rem 0 0' }}>
                                You have opted for Organizer Bus Travel. The administrator is finalizing coach seating layouts. Your bus coach number, route, and boarding time will appear here shortly!
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* HOTEL ROOM STAY PASS */}
                      {myRoom ? (
                        <div className="card" style={{ border: '2px solid var(--success)', backgroundColor: 'var(--card-bg)', position: 'relative', overflow: 'hidden' }}>
                          <div style={{ position: 'absolute', top: 0, right: 0, backgroundColor: 'var(--success)', color: 'white', padding: '0.25rem 0.85rem', borderBottomLeftRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Bed size={13} /> HOTEL ROOM PASS
                          </div>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginTop: '0.5rem' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--success-light)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Bed size={24} />
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <h3 style={{ margin: 0, color: 'var(--success)' }}>Room {myRoom.roomNumber}</h3>
                                <span className="badge" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}>{myRoom.roomType || 'Double Bed'}</span>
                                <span className="badge" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}>{myRoom.floor || 'Ground Floor'}</span>
                              </div>
                              <p style={{ fontSize: '0.85rem', color: 'var(--text)', margin: '0.4rem 0' }}>
                                <strong>Hotel:</strong> {myRoom.hotelName || myHotel?.name || 'Yatra Hotel Accommodation'}
                              </p>
                              {myHotel?.address && (
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.2rem 0' }}>
                                  📍 {myHotel.address}
                                </p>
                              )}
                              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                {myHotel?.gmapsLink && (
                                  <a 
                                    href={myHotel.gmapsLink} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="btn btn-outline" 
                                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                                  >
                                    <MapPin size={13} /> View on Google Maps
                                  </a>
                                )}
                                {myHotel?.phone && (
                                  <a 
                                    href={`tel:${myHotel.phone}`} 
                                    style={{ fontSize: '0.8rem', color: 'var(--text)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                                  >
                                    <Phone size={13} /> Hotel Reception: {myHotel.phone}
                                  </a>
                                )}
                              </div>
                              {myRoom.notes && (
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.5rem 0 0', fontStyle: 'italic' }}>
                                  ℹ️ {myRoom.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="card" style={{ borderLeft: '4px solid var(--border)', backgroundColor: 'var(--bg)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Bed size={22} style={{ color: 'var(--text-muted)' }} />
                            <div>
                              <h4 style={{ margin: 0, color: 'var(--text)' }}>Hotel Room Key Allocation</h4>
                              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
                                Room numbers will be issued upon arrival at the hotel reception or once the administrator finalizes the room check-in manifest.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

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
                          src={selectedYatra.customQrImageUrl || getUPIQRCodeUrl(selectedYatra.upiId, selectedYatra.upiName, 0, 'Confirm Yatra Seat')} 
                          alt="Pay UPI" 
                          style={{ width: '160px', height: '160px', objectFit: 'contain', backgroundColor: 'white', padding: '0.25rem', borderRadius: 'var(--radius-sm)' }}
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
              <h3>{editingYatraId ? 'Edit Spiritual Yatra' : 'Create New Spiritual Yatra'}</h3>
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
              <div className="form-group">
                <label>💰 Price Per Person (₹) <span style={{ color: 'var(--text-muted)', fontWeight: 'normal', fontSize: '0.8rem' }}>— Children under 5 yrs are free</span></label>
                <input type="number" className="form-control" min={0} placeholder="e.g. 7000" value={newYatra.pricePerPerson} onChange={(e) => setNewYatra({...newYatra, pricePerPerson: e.target.value})} />
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

              <div className="form-group">
                <label>🖼️ Custom Payment Scanner / Standee QR Image <span style={{ color: 'var(--text-muted)', fontWeight: 'normal', fontSize: '0.8rem' }}>(Optional)</span></label>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="form-control" 
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleImageUpload(e.target.files[0], (base64) => setNewYatra({...newYatra, customQrImageUrl: base64}));
                    }
                  }} 
                />
                {newYatra.customQrImageUrl && (
                  <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: 'var(--bg)', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
                    <img src={newYatra.customQrImageUrl} alt="Custom QR Preview" style={{ width: '60px', height: '60px', objectFit: 'contain', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', backgroundColor: 'white' }} />
                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 'bold' }}>✓ Custom Scanner Image Attached</span>
                      <br />
                      <button type="button" className="btn btn-outline" style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', marginTop: '0.2rem' }} onClick={() => setNewYatra({...newYatra, customQrImageUrl: ''})}>Remove Image</button>
                    </div>
                  </div>
                )}
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Upload your real PhonePe, GPay, or Paytm standee screenshot. If left blank, an auto-generated QR code is used.</span>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>{editingYatraId ? 'Save Changes' : 'Create Yatra Tour'}</button>
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
              <button className="modal-close" onClick={() => { setIsAddParticipantOpen(false); setAdminAutoFilledDevotee(null); }}>×</button>
            </div>
            <form onSubmit={handleAddParticipant}>
              {/* Returning Devotee Banner */}
              {adminAutoFilledDevotee && (
                <div style={{
                  backgroundColor: '#eff6ff',
                  border: '1.5px solid #3b82f6',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.75rem 1rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  gap: '0.65rem',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <UserCheck size={20} style={{ color: '#2563eb', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.85rem', color: '#1e40af' }}>
                      <strong>Returning Devotee:</strong> {adminAutoFilledDevotee.name} {adminAutoFilledDevotee.familyName ? `(${adminAutoFilledDevotee.familyName})` : ''} — {adminAutoFilledDevotee.familyMembers?.length || 1} family member(s) auto-filled!
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', height: 'auto', color: '#dc2626', borderColor: '#fca5a5' }}
                    onClick={() => {
                      setAdminAutoFilledDevotee(null);
                      setNewParticipant({
                        name: '', phone: newParticipant.phone, email: '', location: '',
                        type: 'individual', familyName: '', membersCount: 1, familyMembers: [],
                        memberDetails: '', travelMode: 'organised', travelType: '',
                        boardingStation: '', droppingStation: '', remarks: '',
                        status: 'interested', paymentStatus: 'pending'
                      });
                    }}
                  >
                    Clear
                  </button>
                </div>
              )}

              <div className="grid-cols-2">
                <div className="form-group">
                  <label>Phone Number (WhatsApp)</label>
                  <input
                    type="tel"
                    required
                    className="form-control"
                    placeholder="9876543210"
                    value={newParticipant.phone}
                    onChange={(e) => handleDevoteePhoneChange(e.target.value, true)}
                    onBlur={() => handleDevoteePhoneChange(newParticipant.phone, true)}
                  />
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                    💡 Enter 10-digit number to auto-populate saved profile & family.
                  </small>
                </div>
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="Amit Gupta"
                    value={newParticipant.name}
                    onChange={(e) => setNewParticipant({...newParticipant, name: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid-cols-2">
                <div className="form-group">
                  <label>Email Address</label>
                  <input type="email" className="form-control" placeholder="amit@gmail.com" value={newParticipant.email} onChange={(e) => setNewParticipant({...newParticipant, email: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Location</label>
                  <input type="text" className="form-control" placeholder="Pune" value={newParticipant.location} onChange={(e) => setNewParticipant({...newParticipant, location: e.target.value})} />
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

                  {/* Notice */}
                  <div style={{ backgroundColor: 'var(--warning-light)', color: 'var(--warning)', border: '1px solid hsla(38,92%,50%,0.3)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '0.85rem', fontSize: '0.82rem' }}>
                    <strong>Note:</strong> Ensure the primary devotee is added with Relation: <strong>"Self"</strong> in the list below so their seat is counted.
                  </div>

                  {!(newParticipant.familyMembers || []).some(m => m.relation === 'Self') && (
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ marginBottom: '0.75rem', fontSize: '0.8rem', padding: '0.35rem 0.6rem', borderColor: 'var(--primary)', color: 'var(--primary)', width: '100%', backgroundColor: 'var(--primary-light)', fontWeight: '600' }}
                      onClick={() => {
                        const selfMember = { name: newParticipant.name || '', relation: 'Self', age: '', phone: newParticipant.phone || '' };
                        const current = newParticipant.familyMembers || [];
                        const updated = [selfMember, ...current];
                        setNewParticipant({ ...newParticipant, familyMembers: updated, membersCount: updated.length });
                      }}
                    >
                      👤 Click to Add Devotee ({newParticipant.name || 'Primary'}) as 1st Member
                    </button>
                  )}

                  <div style={{ marginBottom: '0.75rem' }}>
                    <label style={{ fontWeight: '600', fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem' }}>Family Members</label>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Add details for each family member. Children under 5 years are exempt from yatra fees.</p>
                    
                    {(newParticipant.familyMembers || []).map((member, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem', padding: '0.5rem', backgroundColor: 'var(--card-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                        <div style={{ flex: 2 }}>
                          <input type="text" className="form-control" placeholder="Full Name" value={member.name} onChange={(e) => {
                            const updated = [...newParticipant.familyMembers];
                            updated[idx] = { ...updated[idx], name: e.target.value };
                            setNewParticipant({...newParticipant, familyMembers: updated});
                          }} style={{ fontSize: '0.85rem', padding: '0.4rem' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <select className="form-control" value={member.relation} onChange={(e) => {
                            const updated = [...newParticipant.familyMembers];
                            updated[idx] = { ...updated[idx], relation: e.target.value };
                            setNewParticipant({...newParticipant, familyMembers: updated});
                          }} style={{ fontSize: '0.85rem', padding: '0.4rem' }}>
                            <option value="">Relation</option>
                            <option value="Self">Self</option>
                            <option value="Spouse">Spouse</option>
                            <option value="Son">Son</option>
                            <option value="Daughter">Daughter</option>
                            <option value="Father">Father</option>
                            <option value="Mother">Mother</option>
                            <option value="Brother">Brother</option>
                            <option value="Sister">Sister</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div style={{ width: '60px' }}>
                          <input type="number" className="form-control" placeholder="Age" min={0} max={120} value={member.age} onChange={(e) => {
                            const updated = [...newParticipant.familyMembers];
                            updated[idx] = { ...updated[idx], age: e.target.value };
                            setNewParticipant({...newParticipant, familyMembers: updated});
                          }} style={{ fontSize: '0.85rem', padding: '0.4rem' }} />
                        </div>
                        <div style={{ flex: 1.5 }}>
                          <input type="tel" className="form-control" placeholder="Phone No." value={member.phone} onChange={(e) => {
                            const updated = [...newParticipant.familyMembers];
                            updated[idx] = { ...updated[idx], phone: e.target.value };
                            setNewParticipant({...newParticipant, familyMembers: updated});
                          }} style={{ fontSize: '0.85rem', padding: '0.4rem' }} />
                        </div>
                        <button type="button" className="btn btn-danger btn-icon" style={{ padding: '0.3rem', flexShrink: 0 }} onClick={() => {
                          const updated = newParticipant.familyMembers.filter((_, i) => i !== idx);
                          setNewParticipant({...newParticipant, familyMembers: updated, membersCount: updated.length || 1});
                        }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}

                    <button type="button" className="btn btn-outline" style={{ width: '100%', marginTop: '0.5rem', padding: '0.5rem', fontSize: '0.85rem' }} onClick={() => {
                      const updated = [...(newParticipant.familyMembers || []), { name: '', relation: '', age: '', phone: '' }];
                      setNewParticipant({...newParticipant, familyMembers: updated, membersCount: updated.length});
                    }}>
                      <Plus size={14} /> Add Family Member
                    </button>

                    {/* Admin Modal Family Summary Card */}
                    <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.85rem', marginTop: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                        <strong style={{ fontSize: '0.85rem' }}>Total Members: {newParticipant.familyMembers?.length || 0}</strong>
                        {selectedYatra?.pricePerPerson && (
                          <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 'bold' }}>
                            Yatra Total: ₹{((newParticipant.familyMembers?.filter(m => !m.age || parseInt(m.age) >= 5).length || 0) * parseFloat(selectedYatra.pricePerPerson)).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {newParticipant.familyMembers?.filter(m => !m.age || parseInt(m.age) >= 5).length || 0} billable member(s)
                        {(newParticipant.familyMembers?.filter(m => m.age && parseInt(m.age) < 5).length || 0) > 0 && (
                          <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>
                            {' '}(+{newParticipant.familyMembers.filter(m => m.age && parseInt(m.age) < 5).length} child under 5 yrs traveling FREE)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid-cols-2">
                <div className="form-group">
                  <label>Mode of Travel</label>
                  <select value={newParticipant.travelMode} onChange={(e) => setNewParticipant({...newParticipant, travelMode: e.target.value})}>
                    <option value="organised">As Organised</option>
                    <option value="self">Self Travel</option>
                  </select>
                </div>
                {newParticipant.travelMode === 'self' && (
                  <div className="form-group">
                    <label>Travel Type</label>
                    <select value={newParticipant.travelType} onChange={(e) => setNewParticipant({...newParticipant, travelType: e.target.value})}>
                      <option value="">Select Type...</option>
                      <option value="air">Air</option>
                      <option value="rail">Rail</option>
                      <option value="road">Road</option>
                    </select>
                  </div>
                )}
              </div>
              {newParticipant.travelMode === 'self' && newParticipant.travelType === 'rail' && (
                <div className="grid-cols-2">
                  <div className="form-group">
                    <label>Boarding Station</label>
                    <input type="text" className="form-control" placeholder="Mumbai Central" value={newParticipant.boardingStation} onChange={(e) => setNewParticipant({...newParticipant, boardingStation: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Dropping Station</label>
                    <input type="text" className="form-control" placeholder="Mathura Jn" value={newParticipant.droppingStation} onChange={(e) => setNewParticipant({...newParticipant, droppingStation: e.target.value})} />
                  </div>
                </div>
              )}
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

      {/* MODAL: ADD / EDIT BUS COACH */}
      {isAddBusOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingBusId ? 'Edit Bus Coach Details' : 'Add Bus Coach to Fleet'}</h3>
              <button className="modal-close" onClick={() => setIsAddBusOpen(false)}>×</button>
            </div>
            <form onSubmit={handleAddBus}>
              <div className="grid-cols-2">
                <div className="form-group">
                  <label>Bus Coach Name *</label>
                  <input 
                    type="text" 
                    required 
                    className="form-control" 
                    placeholder="e.g. Bus 1 (AC Video Coach)" 
                    value={newBus.name} 
                    onChange={(e) => setNewBus({ ...newBus, name: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label>Vehicle Reg. Number</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. MH 02 AB 1234" 
                    value={newBus.busNumber} 
                    onChange={(e) => setNewBus({ ...newBus, busNumber: e.target.value })} 
                  />
                </div>
              </div>

              <div className="grid-cols-2">
                <div className="form-group">
                  <label>Seating Capacity *</label>
                  <input 
                    type="number" 
                    required 
                    min="1" 
                    max="100" 
                    className="form-control" 
                    placeholder="35" 
                    value={newBus.capacity} 
                    onChange={(e) => setNewBus({ ...newBus, capacity: parseInt(e.target.value) || 0 })} 
                  />
                </div>
                <div className="form-group">
                  <label>Route</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. Mumbai -> Mathura -> Vrindavan" 
                    value={newBus.route} 
                    onChange={(e) => setNewBus({ ...newBus, route: e.target.value })} 
                  />
                </div>
              </div>

              <div className="grid-cols-2">
                <div className="form-group">
                  <label>Boarding Point</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. Platform 1 Main Gate, Mumbai Central" 
                    value={newBus.boardingPoint} 
                    onChange={(e) => setNewBus({ ...newBus, boardingPoint: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label>Departure Date & Time</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. 06:00 AM (Day 1)" 
                    value={newBus.departureTime} 
                    onChange={(e) => setNewBus({ ...newBus, departureTime: e.target.value })} 
                  />
                </div>
              </div>

              <div className="grid-cols-2">
                <div className="form-group">
                  <label>Bus Coordinator Name</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. Syamasundara Das" 
                    value={newBus.coordinatorName} 
                    onChange={(e) => setNewBus({ ...newBus, coordinatorName: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label>Coordinator Phone Number</label>
                  <input 
                    type="tel" 
                    className="form-control" 
                    placeholder="e.g. 9812345678" 
                    value={newBus.coordinatorPhone} 
                    onChange={(e) => setNewBus({ ...newBus, coordinatorPhone: e.target.value })} 
                  />
                </div>
              </div>

              <div className="grid-cols-2">
                <div className="form-group">
                  <label>Driver Name</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. Raju Bhai" 
                    value={newBus.driverName} 
                    onChange={(e) => setNewBus({ ...newBus, driverName: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label>Driver Phone Number</label>
                  <input 
                    type="tel" 
                    className="form-control" 
                    placeholder="e.g. 9898765432" 
                    value={newBus.driverPhone} 
                    onChange={(e) => setNewBus({ ...newBus, driverPhone: e.target.value })} 
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Important Instructions / Notes for Passengers</label>
                <textarea 
                  className="form-control" 
                  rows={2} 
                  placeholder="e.g. AC coach, water bottles provided. Please arrive 20 minutes before departure." 
                  value={newBus.notes} 
                  onChange={(e) => setNewBus({ ...newBus, notes: e.target.value })} 
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                {editingBusId ? 'Save Bus Changes' : 'Add Bus Coach to Fleet'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT HOTEL ROOM */}
      {isAddRoomOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingRoomId ? 'Edit Room Details' : 'Add Hotel Room Inventory'}</h3>
              <button className="modal-close" onClick={() => setIsAddRoomOpen(false)}>×</button>
            </div>
            <form onSubmit={handleAddRoom}>
              <div className="form-group">
                <label>Hotel Name</label>
                {hotels.length > 0 ? (
                  <select 
                    className="form-control" 
                    value={newRoom.hotelName} 
                    onChange={(e) => setNewRoom({ ...newRoom, hotelName: e.target.value })}
                  >
                    {hotels.map(h => (
                      <option key={h.id} value={h.name}>{h.name} {h.finalSelected ? '(Final Selected)' : ''}</option>
                    ))}
                  </select>
                ) : (
                  <input 
                    type="text" 
                    required 
                    className="form-control" 
                    placeholder="e.g. MVT Guesthouse" 
                    value={newRoom.hotelName} 
                    onChange={(e) => setNewRoom({ ...newRoom, hotelName: e.target.value })} 
                  />
                )}
              </div>

              <div className="grid-cols-2">
                <div className="form-group">
                  <label>Room Number / Name *</label>
                  <input 
                    type="text" 
                    required 
                    className="form-control" 
                    placeholder="e.g. 101, 102, Villa A" 
                    value={newRoom.roomNumber} 
                    onChange={(e) => setNewRoom({ ...newRoom, roomNumber: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label>Floor / Wing</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. Ground Floor, 1st Floor" 
                    value={newRoom.floor} 
                    onChange={(e) => setNewRoom({ ...newRoom, floor: e.target.value })} 
                  />
                </div>
              </div>

              <div className="grid-cols-2">
                <div className="form-group">
                  <label>Room Type</label>
                  <select 
                    className="form-control" 
                    value={newRoom.roomType} 
                    onChange={(e) => setNewRoom({ ...newRoom, roomType: e.target.value })}
                  >
                    <option value="Double Bed">Double Bed (2 Pax)</option>
                    <option value="Triple Bed">Triple Bed (3 Pax)</option>
                    <option value="Four Bed / Family Suite">Four Bed / Family Suite (4 Pax)</option>
                    <option value="Deluxe Suite">Deluxe Suite</option>
                    <option value="Single Room">Single Room (1 Pax)</option>
                    <option value="Dormitory Bed">Dormitory Bed</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Standard Capacity (Beds) *</label>
                  <input 
                    type="number" 
                    required 
                    min="1" 
                    max="10" 
                    className="form-control" 
                    placeholder="2" 
                    value={newRoom.capacity} 
                    onChange={(e) => setNewRoom({ ...newRoom, capacity: parseInt(e.target.value) || 2 })} 
                  />
                </div>
              </div>

              <div className="grid-cols-2">
                <div className="form-group">
                  <label>Extra Mattress Allowed / Cost (₹)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    placeholder="500" 
                    value={newRoom.extraMattressCost} 
                    onChange={(e) => setNewRoom({ ...newRoom, extraMattressCost: parseInt(e.target.value) || 0 })} 
                  />
                </div>
                <div className="form-group">
                  <label>Special Amenities / Notes</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. Attached Geyser, Balcony, Ground Floor" 
                    value={newRoom.notes} 
                    onChange={(e) => setNewRoom({ ...newRoom, notes: e.target.value })} 
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                {editingRoomId ? 'Save Room Changes' : 'Add Room to Inventory'}
              </button>
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
