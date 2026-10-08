import React, { useState, useEffect } from 'react';
import { 
  Compass, Hotel, Users, CheckCircle, CreditCard, Receipt, Image as ImageIcon, 
  FileText, BarChart2, MessageSquare, Plus, Trash2, Edit2, Search, Download, 
  Check, X, LogOut, ArrowLeft, Eye, RefreshCw, AlertTriangle, 
  ClipboardList, Settings, Share2, Upload, FileDown, Phone, MapPin, ExternalLink,
  Sparkles, UserCheck, Lock, Clock,
  Bus, Bed, Shuffle,
  Key, EyeOff, Copy, ShieldCheck,
  Printer, Languages, BookOpen, ArrowUpDown
} from 'lucide-react';
import db from './db';
import JSZip from 'jszip';
import { getTranslation } from './translations';

// Participant Registration Timestamp & Date Helpers (for chronologically sorting newest on top)
const getParticipantTimestamp = (part) => {
  if (!part) return 0;
  const raw = part.registeredAt || part.createdAt || part.registeredDate;
  if (raw) {
    if (typeof raw === 'number') return raw;
    if (raw.toMillis && typeof raw.toMillis === 'function') return raw.toMillis();
    if (raw.seconds) return raw.seconds * 1000;
    const parsed = new Date(raw).getTime();
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  // Check if id contains numeric timestamp
  if (part.id && typeof part.id === 'string') {
    const match = part.id.match(/\d{10,13}/);
    if (match) {
      const ts = parseInt(match[0], 10);
      if (ts > 1000000000) return ts > 1000000000000 ? ts : ts * 1000;
    }
    // Sequential mock IDs like 'p1', 'p2', ... 'p7'
    const seq = part.id.match(/^p(\d+)$/i);
    if (seq) {
      return 1700000000000 + parseInt(seq[1], 10) * 86400000;
    }
  }
  return 0;
};

const formatRegistrationDate = (part, includeYear = false) => {
  if (!part) return null;
  const raw = part.registeredAt || part.createdAt || part.registeredDate;
  if (!raw) return null;
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return null;
    const options = {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    };
    if (includeYear) {
      options.year = 'numeric';
    }
    return d.toLocaleDateString('en-IN', options);
  } catch (e) {
    return null;
  }
};

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
  // Strict Super Admin authorization check (strictly exclusive to Super Admin)
  const isSuperAdmin = currentUser?.role === 'super_admin' || currentUser?.email?.toLowerCase() === 'rohit.wadhwani83@gmail.com';
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

  // Language Localization State (English 'en' | Hindi 'hi')
  const [lang, setLang] = useState(() => localStorage.getItem('yatra_lang') || 'en');
  const t = (key) => getTranslation(key, lang);
  const toggleLanguage = (selectedLang) => {
    const newLang = selectedLang || (lang === 'en' ? 'hi' : 'en');
    setLang(newLang);
    localStorage.setItem('yatra_lang', newLang);
  };

  // Printable Badges State
  const [isPrintBadgesOpen, setIsPrintBadgesOpen] = useState(false);
  const [badgeFilterBus, setBadgeFilterBus] = useState('all');
  const [badgeFilterHotel, setBadgeFilterHotel] = useState('all');
  const [singleBadgeParticipant, setSingleBadgeParticipant] = useState(null);
  
  // Login Form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginPhone, setLoginPhone] = useState('');
  const [loginRole, setLoginRole] = useState('admin'); // 'admin' | 'super_admin' | 'participant'
  const [loginError, setLoginError] = useState('');
  const [loginInviteBanner, setLoginInviteBanner] = useState('');

  // Forced First-Time Login Password Change
  const [isFirstLoginOpen, setIsFirstLoginOpen] = useState(false);
  const [firstLoginUser, setFirstLoginUser] = useState(null);
  const [newFirstPassword, setNewFirstPassword] = useState('');
  const [confirmFirstPassword, setConfirmFirstPassword] = useState('');
  const [showFirstPassword, setShowFirstPassword] = useState(false);
  const [firstPasswordError, setFirstPasswordError] = useState('');

  // Forgot Password Module
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordStatus, setForgotPasswordStatus] = useState('idle'); // 'idle' | 'success' | 'error'
  const [forgotPasswordMsg, setForgotPasswordMsg] = useState('');
  const [generatedResetLink, setGeneratedResetLink] = useState('');
  const [copiedResetLink, setCopiedResetLink] = useState(false);

  // Reset Password Screen (via token link)
  const [resetTokenUser, setResetTokenUser] = useState(null);
  const [resetTokenStatus, setResetTokenStatus] = useState('checking'); // 'checking' | 'valid' | 'invalid'
  const [newResetPassword, setNewResetPassword] = useState('');
  const [confirmResetPassword, setConfirmResetPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetPasswordError, setResetPasswordError] = useState('');

  // Change Password Modal (Anytime while logged in)
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [currentChangePassword, setCurrentChangePassword] = useState('');
  const [newChangePassword, setNewChangePassword] = useState('');
  const [confirmChangePassword, setConfirmChangePassword] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState('');

  // Admin Management State
  const [systemUsers, setSystemUsers] = useState([]);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPhone, setNewAdminPhone] = useState('');
  const [newAdminTempPassword, setNewAdminTempPassword] = useState('YatraAdmin@2026');
  const [createdAdminSuccess, setCreatedAdminSuccess] = useState(null);
  const [copiedAdminCreds, setCopiedAdminCreds] = useState(false);

  // Modals
  const [isCreateYatraOpen, setIsCreateYatraOpen] = useState(false);
  const [editingYatraId, setEditingYatraId] = useState(null);
  const [isAddHotelOpen, setIsAddHotelOpen] = useState(false);
  const [isAddParticipantOpen, setIsAddParticipantOpen] = useState(false);
  const [editingParticipantId, setEditingParticipantId] = useState(null);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuditTrailOpen, setIsAuditTrailOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditSearchQuery, setAuditSearchQuery] = useState('');
  const [auditRoleFilter, setAuditRoleFilter] = useState('all');
  const [auditCategoryFilter, setAuditCategoryFilter] = useState('all');
  const [auditYatraFilter, setAuditYatraFilter] = useState('all');
  const [auditDateFilter, setAuditDateFilter] = useState('all');
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [isUploadDocOpen, setIsUploadDocOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isAddBusOpen, setIsAddBusOpen] = useState(false);
  const [editingBusId, setEditingBusId] = useState(null);
  const [newBus, setNewBus] = useState({ name: '', busNumber: '', route: '', capacity: 35, coordinatorName: '', coordinatorPhone: '', driverName: '', driverPhone: '', departureTime: '06:00 AM', boardingPoint: '', notes: '' });
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState(null);
  const [selectedHotelFilter, setSelectedHotelFilter] = useState('all');
  const [newRoom, setNewRoom] = useState({ 
    roomNumber: '', 
    roomType: 'Twin Bed (2 Beds)', 
    bedCount: 2,
    extraMattressAllowed: 0,
    capacity: 2, 
    floor: 'Ground Floor', 
    hotelName: '', 
    hotelId: '', 
    extraMattressCost: 500, 
    notes: '',
    isCustomHotel: false,
    customHotelName: '',
    customHotelAddress: '',
    customHotelContact: '',
    customHotelPhone: ''
  });

  // Form states for adding items
  const defaultDeadline = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [newYatra, setNewYatra] = useState({ name: '', destination: '', startDate: '', endDate: '', expectedParticipants: 30, pricePerPerson: '', customQrImageUrl: '', upiId: 'rohit.wadhwani83@okaxis', upiName: 'Rohit Wadhwani', registrationDeadline: defaultDeadline });
  const [newHotel, setNewHotel] = useState({ name: '', address: '', gmapsLink: '', bookingLink: '', contactPerson: '', phone: '', roomsAvailable: 10, roomPrice: 2000, extraMattressCost: 500, distanceFromTemple: '', notes: '', contacted: false, shortlisted: false, finalSelected: false, quoteImageUrl: '' });
  const [newParticipant, setNewParticipant] = useState({ name: '', phone: '', email: '', location: '', type: 'individual', familyName: '', membersCount: 1, familyMembers: [], memberDetails: '', travelMode: 'organised', travelType: '', boardingStation: '', droppingStation: '', remarks: '', status: 'interested', paymentStatus: 'pending', approvalStatus: 'pending', isApproved: false });
  const [newExpense, setNewExpense] = useState({ date: new Date().toISOString().split('T')[0], category: 'hotel', amount: '', paidBy: '', remarks: '', appliesTo: 'everyone', targetIds: [], billImageUrl: '' });
  const [newDocument, setNewDocument] = useState({ name: '', fileUrl: '', type: 'pdf' });

  // Eligibility Helper: Devotee can pay only after admin approval
  const isDevoteeApproved = (p) => {
    if (!p) return false;
    if (p.approvalStatus === 'approved' || p.isApproved === true) return true;
    if (p.approvalStatus === 'pending' || p.approvalStatus === 'rejected') return false;
    if (p.isApproved === false) return false;
    // Backward compatibility: existing confirmed/paid devotees in mock/database are treated as approved
    if (p.status === 'confirmed' || p.paymentStatus === 'completed' || p.paymentStatus === 'partially_paid') return true;
    return false;
  };
  
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

  // Devotee payment method & cash commitment states
  const [devoteePayTab, setDevoteePayTab] = useState('upi'); // 'upi' | 'cash'
  const [devoteeCashPromiseDate, setDevoteeCashPromiseDate] = useState('');
  const [devoteeCashPromiseAmount, setDevoteeCashPromiseAmount] = useState('');
  const [devoteeCashPromiseNotes, setDevoteeCashPromiseNotes] = useState('');

  // New Task Form state (for upgraded To-Do Checklist)
  const [newTaskForm, setNewTaskForm] = useState({ text: '', details: '', date: '' });
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);

  // Participants Tab Enhanced UI States
  const [participantViewMode, setParticipantViewMode] = useState('table'); // 'table' | 'cards'
  const [participantFilter, setParticipantFilter] = useState('all'); // 'all' | 'confirmed' | 'interested' | 'partially_paid' | 'completed'
  const [participantSortOrder, setParticipantSortOrder] = useState('newest'); // 'newest' | 'oldest' | 'name' | 'seats'
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
        // Ensure participants are chronologically sorted latest first
        const sortedPData = [...pData].sort((a, b) => getParticipantTimestamp(b) - getParticipantTimestamp(a));
        setParticipants(sortedPData);
        setPayments(payData);
        setExpenses(eData);
        setPhotos(phData);
        setMyPhotos(phData);
        setNotes(nData);
        setDocuments(dData);
        setBuses(bData);
        setRooms(rData);
      }

      // Load audit logs strictly for Super Admin only
      if (isSuperAdmin) {
        db.getAuditLogs().then(logs => setAuditLogs(logs || [])).catch(() => {});
      }
    }
    loadData();
  }, [selectedYatra, refreshTrigger, isFirebaseConnected, currentUser]);

  // Clean up expired sandbox test yatras automatically
  useEffect(() => {
    const cleanupExpiredSandboxes = async () => {
      try {
        const allYatras = await db.getYatras();
        const expired = allYatras.filter(y => y.isSandbox && y.sandboxExpiresAt && Date.now() > y.sandboxExpiresAt);
        for (const sb of expired) {
          const parts = await db.getParticipants(sb.id);
          for (const p of parts) await db.deleteParticipant(p.id);
          const buses = await db.getBuses(sb.id);
          for (const b of buses) await db.deleteBus(b.id);
          const hotels = await db.getHotels(sb.id);
          for (const h of hotels) await db.deleteHotel(h.id);
          const rms = await db.getRooms(sb.id);
          for (const r of rms) await db.deleteRoom(r.id);
          await db.deleteYatra(sb.id);
        }
        if (expired.length > 0) {
          setRefreshTrigger(prev => prev + 1);
        }
      } catch (err) {
        console.warn("Sandbox cleanup notice:", err);
      }
    };
    cleanupExpiredSandboxes();
  }, []);

  // Close badges modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isPrintBadgesOpen) {
        setIsPrintBadgesOpen(false);
        setSingleBadgeParticipant(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPrintBadgesOpen]);

  // --- Custom Router Effect ---
  useEffect(() => {
    const handleHash = () => {
      const rawHash = window.location.hash || '#/login';
      const cleanHash = rawHash.replace(/^#\/?/, '');
      const [pathAndId, queryString] = cleanHash.split('?');
      const parts = pathAndId.split('/');
      const path = parts[0] || 'login';
      const id = parts[1] || '';
      
      setCurrentRoute({ path, id });
      if (path !== 'register') {
        setPublicRegStatus(null);
      }

      // Check for Admin Invitation Token (auto-registers and pre-fills admin on any device)
      const fullSearch = (queryString ? `?${queryString}` : '') + (window.location.search || '');
      const urlParams = new URLSearchParams(fullSearch);
      let inviteToken = urlParams.get('invite');
      if (!inviteToken && rawHash.includes('invite=')) {
        inviteToken = rawHash.split('invite=')[1].split('&')[0];
      }
      if (inviteToken) {
        try {
          const jsonStr = decodeURIComponent(escape(atob(inviteToken)));
          const invitedUser = JSON.parse(jsonStr);
          if (invitedUser && invitedUser.email && invitedUser.password) {
            db.getUsers().then(async (allUsers) => {
              const cleanInvEmail = invitedUser.email.toLowerCase().trim();
              const existing = allUsers.find(u => u.email && u.email.toLowerCase().trim() === cleanInvEmail);
              if (!existing) {
                await db.addUser({
                  id: invitedUser.id || ('admin_' + Math.random().toString(36).substring(2, 9)),
                  email: cleanInvEmail,
                  name: invitedUser.name || 'Yatra Administrator',
                  phone: invitedUser.phone || '',
                  password: invitedUser.password,
                  role: invitedUser.role || 'admin',
                  mustChangePassword: true,
                  createdAt: new Date().toISOString()
                });
              }
              setLoginRole('admin');
              setLoginEmail(invitedUser.email);
              setLoginPassword(invitedUser.password);
              setLoginInviteBanner(`Hare Krishna ${invitedUser.name || ''}! Your administrator credentials have been configured on this device. Temporary password pre-filled. Please click 'Sign In' to set your personal secret password.`);
            });
          }
        } catch (e) {
          console.warn("Could not parse invite token", e);
        }
      }

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
          if (found) {
            setSelectedYatra(found);
            db.getParticipants(found.id).then(parts => setParticipants(parts || []));
          }
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
      } else if (path === 'reset-password' && id) {
        setResetTokenStatus('checking');
        setResetPasswordError('');
        setNewResetPassword('');
        setConfirmResetPassword('');
        db.getUsers().then(users => {
          const found = users.find(u => u.resetToken === id);
          if (found && found.resetTokenExpiry && new Date() < new Date(found.resetTokenExpiry)) {
            setResetTokenUser(found);
            setResetTokenStatus('valid');
          } else {
            setResetTokenUser(null);
            setResetTokenStatus('invalid');
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
        setLoginError('Please enter your email or mobile number and password.');
        return;
      }

      const cleanInput = loginEmail.trim().toLowerCase();
      const digitsOnly = cleanInput.replace(/\D/g, '');
      const inputPassword = loginPassword.trim();

      db.getUsers().then(users => {
        const superAdminDefault = { id: 'super_admin_1', email: 'rohit.wadhwani83@gmail.com', role: 'super_admin', name: 'Rohit Wadhwani (Super)', password: 'admin123', mustChangePassword: false };
        const adminDefault = { id: 'admin_1', email: 'admin@yatra.com', role: 'admin', name: 'Krishna Das (Admin)', password: 'admin123', mustChangePassword: false };

        const allUsers = [...users];
        if (!allUsers.some(u => u.email && u.email.toLowerCase() === superAdminDefault.email.toLowerCase())) {
          allUsers.push(superAdminDefault);
        }
        if (!allUsers.some(u => u.email && u.email.toLowerCase() === adminDefault.email.toLowerCase())) {
          allUsers.push(adminDefault);
        }

        // Search user by email, mobile number, or name
        const matched = allUsers.find(u => {
          const emailMatch = u.email && u.email.trim().toLowerCase() === cleanInput;
          const phoneClean = u.phone ? u.phone.replace(/\D/g, '') : '';
          const phoneMatch = digitsOnly.length >= 10 && phoneClean && (phoneClean.endsWith(digitsOnly.slice(-10)) || digitsOnly.endsWith(phoneClean.slice(-10)));
          const nameMatch = u.name && u.name.trim().toLowerCase() === cleanInput;
          return emailMatch || phoneMatch || nameMatch;
        });

        if (!matched) {
          setLoginError('No administrator account found with this email or mobile number on this device. If you received an invitation link, please click it directly on your device to activate your account.');
          return;
        }

        const expectedPwd = (matched.password || 'admin123').trim();
        if (inputPassword !== expectedPwd) {
          setLoginError('Incorrect password. Please verify your temporary password (passwords are case-sensitive).');
          return;
        }

        // Successfully matched credentials!
        if (matched.mustChangePassword) {
          setFirstLoginUser(matched);
          setNewFirstPassword('');
          setConfirmFirstPassword('');
          setFirstPasswordError('');
          setIsFirstLoginOpen(true);
        } else {
          const isMatchedSuper = matched.role === 'super_admin' || (matched.email && matched.email.trim().toLowerCase() === 'rohit.wadhwani83@gmail.com');
          if (loginRole === 'super_admin' && !isMatchedSuper) {
            setLoginError('Access restricted: This tab is strictly reserved for the Super Admin. Please select the "Admin" tab to sign in.');
            return;
          }
          const userRole = isMatchedSuper ? 'super_admin' : 'admin';
          setCurrentUser({ 
            email: matched.email, 
            role: userRole, 
            name: matched.name || (isMatchedSuper ? 'Rohit Wadhwani (Super)' : 'Yatra Administrator'), 
            id: matched.id,
            phone: matched.phone || ''
          });
          navigateTo('dashboard');
        }
      });
    }
  };

  // --- Forced First-Time Login Password Change ---
  const handleFirstLoginPasswordChange = async (e) => {
    e.preventDefault();
    setFirstPasswordError('');

    if (!newFirstPassword || newFirstPassword.length < 6) {
      setFirstPasswordError('Password must be at least 6 characters long.');
      return;
    }
    if (newFirstPassword !== confirmFirstPassword) {
      setFirstPasswordError('New password and confirmation password do not match.');
      return;
    }
    if (newFirstPassword === 'admin123' || newFirstPassword === 'YatraAdmin@2026') {
      setFirstPasswordError('Please choose your own unique secret password instead of the default temporary password.');
      return;
    }

    try {
      if (firstLoginUser.id) {
        await db.updateUser(firstLoginUser.id, {
          password: newFirstPassword,
          mustChangePassword: false,
          passwordUpdatedAt: new Date().toISOString()
        });
      }
      setCurrentUser({
        email: firstLoginUser.email,
        role: firstLoginUser.role,
        name: firstLoginUser.name,
        id: firstLoginUser.id,
        phone: firstLoginUser.phone || ''
      });
      setIsFirstLoginOpen(false);
      setNewFirstPassword('');
      setConfirmFirstPassword('');
      navigateTo('dashboard');
      alert(`🎉 Password set successfully!\nWelcome, ${firstLoginUser.name}. You are now signed in to the Yatra Management dashboard.`);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error(err);
      setFirstPasswordError('Failed to save new password. Please try again.');
    }
  };

  // --- Forgot Password Module ---
  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setForgotPasswordStatus('idle');
    setForgotPasswordMsg('');

    const targetEmail = forgotPasswordEmail.trim().toLowerCase();
    if (!targetEmail) return;

    const users = await db.getUsers();
    const matchedUser = users.find(u => u.email.toLowerCase() === targetEmail && (u.role === 'admin' || u.role === 'super_admin')) ||
      (targetEmail === 'rohit.wadhwani83@gmail.com' ? { id: 'super_admin_1', email: targetEmail, name: 'Rohit Wadhwani (Super)', role: 'super_admin' } : null) ||
      (targetEmail === 'admin@yatra.com' ? { id: 'admin_1', email: targetEmail, name: 'Krishna Das (Admin)', role: 'admin' } : null);

    if (!matchedUser) {
      setForgotPasswordStatus('error');
      setForgotPasswordMsg(`No administrator account found with email: ${targetEmail}. Please check spelling or contact Super Admin.`);
      return;
    }

    const token = 'rst_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    const expiry = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour validity

    if (matchedUser.id) {
      await db.updateUser(matchedUser.id, {
        resetToken: token,
        resetTokenExpiry: expiry
      });
    }

    const resetLink = `${window.location.origin}${window.location.pathname}#/reset-password/${token}`;
    setGeneratedResetLink(resetLink);
    setForgotPasswordStatus('success');
    setForgotPasswordMsg(`Password reset link generated for ${matchedUser.name} (${targetEmail}).`);
    setRefreshTrigger(prev => prev + 1);
  };

  // --- Reset Password Screen Submission ---
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setResetPasswordError('');

    if (!newResetPassword || newResetPassword.length < 6) {
      setResetPasswordError('Password must be at least 6 characters long.');
      return;
    }
    if (newResetPassword !== confirmResetPassword) {
      setResetPasswordError('Passwords do not match.');
      return;
    }

    try {
      if (resetTokenUser?.id) {
        await db.updateUser(resetTokenUser.id, {
          password: newResetPassword,
          mustChangePassword: false,
          resetToken: null,
          resetTokenExpiry: null,
          passwordUpdatedAt: new Date().toISOString()
        });
      }
      setCurrentUser({
        email: resetTokenUser.email,
        role: resetTokenUser.role,
        name: resetTokenUser.name,
        id: resetTokenUser.id,
        phone: resetTokenUser.phone || ''
      });
      setNewResetPassword('');
      setConfirmResetPassword('');
      setResetTokenUser(null);
      setResetTokenStatus('checking');
      navigateTo('dashboard');
      alert(`🎉 Password reset successfully! You are now logged in as ${resetTokenUser.name}.`);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error(err);
      setResetPasswordError('Failed to reset password. Please try again.');
    }
  };

  // --- Change Password (Anytime from Profile / Header) ---
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setChangePasswordError('');

    if (!newChangePassword || newChangePassword.length < 6) {
      setChangePasswordError('New password must be at least 6 characters long.');
      return;
    }
    if (newChangePassword !== confirmChangePassword) {
      setChangePasswordError('New password and confirm password do not match.');
      return;
    }

    const users = await db.getUsers();
    const userInDb = users.find(u => u.email.toLowerCase() === currentUser.email.toLowerCase()) ||
      (currentUser.email.toLowerCase() === 'rohit.wadhwani83@gmail.com' ? { id: 'super_admin_1', password: 'admin123' } : null) ||
      (currentUser.email.toLowerCase() === 'admin@yatra.com' ? { id: 'admin_1', password: 'admin123' } : null);

    const expectedCurrent = userInDb?.password || 'admin123';
    if (currentChangePassword !== expectedCurrent) {
      setChangePasswordError('Current password entered is incorrect.');
      return;
    }

    if (userInDb?.id) {
      await db.updateUser(userInDb.id, {
        password: newChangePassword,
        mustChangePassword: false,
        passwordUpdatedAt: new Date().toISOString()
      });
    }

    setIsChangePasswordOpen(false);
    setCurrentChangePassword('');
    setNewChangePassword('');
    setConfirmChangePassword('');
    alert('🎉 Your password has been successfully updated!');
    setRefreshTrigger(prev => prev + 1);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedYatra(null);
    setMyParticipantData(null);
    setDevoteeCashPromiseAmount('');
    setDevoteeCashPromiseDate('');
    setDevoteeCashPromiseNotes('');
    navigateTo('login');
  };

  // --- Super Admin Audit Trail Helpers ---
  const loadAuditLogs = async () => {
    if (!isSuperAdmin) return;
    setIsLoadingAudit(true);
    try {
      const logs = await db.getAuditLogs();
      setAuditLogs(logs || []);
    } catch (err) {
      console.warn("Could not load audit logs:", err);
    } finally {
      setIsLoadingAudit(false);
    }
  };

  const getCurrentActor = () => {
    if (currentUser?.role === 'super_admin') {
      return {
        id: currentUser.id || 'super_admin_1',
        name: currentUser.name || 'Rohit Wadhwani',
        phone: currentUser.phone || '+919876543210',
        email: currentUser.email || 'rohit.wadhwani83@gmail.com',
        role: 'super_admin'
      };
    }
    if (currentUser?.role === 'admin') {
      return {
        id: currentUser.id || 'admin_1',
        name: currentUser.name || 'Admin',
        phone: currentUser.phone || '',
        email: currentUser.email || 'admin@yatra.com',
        role: 'admin'
      };
    }
    if (myParticipantData) {
      return {
        id: myParticipantData.id || '',
        name: myParticipantData.name || 'Devotee',
        phone: myParticipantData.phone || devoteeLoginPhone || '',
        email: myParticipantData.email || '',
        role: 'devotee'
      };
    }
    if (currentUser?.role === 'participant') {
      return {
        id: currentUser.phone || devoteeLoginPhone || '',
        name: currentUser.name || 'Devotee',
        phone: currentUser.phone || devoteeLoginPhone || '',
        email: currentUser.email || '',
        role: 'devotee'
      };
    }
    return {
      id: 'devotee_guest',
      name: 'Devotee (Public Portal)',
      phone: '',
      email: '',
      role: 'devotee'
    };
  };

  const recordAudit = async ({ yatraId, yatraTitle, category, action, details, actorOverride, metadata }) => {
    try {
      const actor = actorOverride || getCurrentActor();
      const targetYatra = (yatras && yatras.find(y => y.id === (yatraId || selectedYatra?.id))) || selectedYatra;
      const yId = yatraId || (targetYatra ? targetYatra.id : 'global');
      const yTitle = yatraTitle || (targetYatra ? targetYatra.name : 'System Wide');

      const entry = await db.logAudit({
        yatraId: yId,
        yatraTitle: yTitle,
        category: category || 'General',
        action: action || 'UPDATE',
        details: details || '',
        actor,
        metadata: metadata || {}
      });

      // Update in-memory audit logs if Super Admin is active
      if (entry && currentUser?.role === 'super_admin') {
        setAuditLogs(prev => [entry, ...prev.filter(p => p.id !== entry.id)]);
      }
    } catch (err) {
      console.warn("Could not record audit log:", err);
    }
  };

  const formatAuditTimestamp = (rawTs) => {
    if (!rawTs) return '';
    try {
      const d = new Date(rawTs);
      if (isNaN(d.getTime())) return String(rawTs);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return String(rawTs);
    }
  };

  const getRelativeTime = (rawTs) => {
    if (!rawTs) return '';
    try {
      const d = new Date(rawTs).getTime();
      if (isNaN(d)) return '';
      const diffSec = Math.floor((Date.now() - d) / 1000);
      if (diffSec < 60) return 'Just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr}h ago`;
      const diffDays = Math.floor(diffHr / 24);
      if (diffDays < 30) return `${diffDays}d ago`;
      return '';
    } catch (e) {
      return '';
    }
  };

  const exportAuditCsv = (logsToExport = []) => {
    const data = logsToExport.length > 0 ? logsToExport : auditLogs;
    if (!data || data.length === 0) {
      alert("No audit logs available to export.");
      return;
    }
    const headers = ["Timestamp", "Yatra", "Category", "Action", "Actor Name", "Actor Phone", "Actor Role", "Actor Email", "Details"];
    const rows = data.map(log => [
      `"${log.timestamp || ''}"`,
      `"${(log.yatraTitle || '').replace(/"/g, '""')}"`,
      `"${(log.category || '').replace(/"/g, '""')}"`,
      `"${(log.action || '').replace(/"/g, '""')}"`,
      `"${(log.actor?.name || '').replace(/"/g, '""')}"`,
      `"${(log.actor?.phone || '').replace(/"/g, '""')}"`,
      `"${(log.actor?.role || '').replace(/"/g, '""')}"`,
      `"${(log.actor?.email || '').replace(/"/g, '""')}"`,
      `"${(log.details || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Super_Admin_Audit_Trail_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- CRUD Operation Triggers ---
  const handleCreateYatra = async (e) => {
    e.preventDefault();
    const actor = getCurrentActor();
    if (editingYatraId) {
      await db.updateYatra(editingYatraId, newYatra);
      await recordAudit({
        yatraId: editingYatraId,
        yatraTitle: newYatra.name,
        category: 'Yatra Settings',
        action: 'YATRA_UPDATED',
        details: `${actor.name} (${actor.phone || actor.email}) updated configuration for Yatra "${newYatra.name}". Destination: ${newYatra.destination}, Dates: ${newYatra.startDate} to ${newYatra.endDate}, Price/Person: ₹${newYatra.pricePerPerson || '0'}.`,
        metadata: { yatraId: editingYatraId }
      });
      setEditingYatraId(null);
    } else {
      const id = 'yatra_' + Math.random().toString(36).substring(2, 9);
      await db.addYatra({ ...newYatra, id, status: 'planning', isDeleted: false });
      await recordAudit({
        yatraId: id,
        yatraTitle: newYatra.name,
        category: 'Yatra Settings',
        action: 'YATRA_CREATED',
        details: `${actor.name} (${actor.phone || actor.email}) created new Yatra "${newYatra.name}" to ${newYatra.destination} (${newYatra.startDate} to ${newYatra.endDate}). Target: ${newYatra.expectedParticipants || 30} pilgrims.`,
        metadata: { yatraId: id }
      });
    }
    setIsCreateYatraOpen(false);
    setNewYatra({ name: '', destination: '', startDate: '', endDate: '', expectedParticipants: 30, pricePerPerson: '', customQrImageUrl: '', upiId: 'rohit.wadhwani83@okaxis', upiName: 'Rohit Wadhwani', registrationDeadline: defaultDeadline });
    setRefreshTrigger(prev => prev + 1);
  };

  // --- Universal Stage Change Reconfirmation Guard ---
  const handleStageChange = async (targetStage) => {
    if (!selectedYatra || selectedYatra.status === targetStage) return;

    let confirmMsg = '';
    if (targetStage === 'registration_open') {
      confirmMsg = `Are you sure you want to open public registrations for "${selectedYatra.name}"?\n\nThe public registration link will become active and devotees will be able to register online.`;
    } else if (targetStage === 'confirmed') {
      confirmMsg = `Confirm "${selectedYatra.name}"?\n\nThis will lock public registration and close the public link as travel and accommodation bookings are finalized. Organizers can still add devotees manually if needed.`;
    } else if (targetStage === 'completed') {
      confirmMsg = `Mark "${selectedYatra.name}" as Completed?\n\nThis will archive the Yatra and mark all bookings and financial accounts as settled.`;
    } else if (targetStage === 'planning') {
      confirmMsg = `Move "${selectedYatra.name}" back to Planning stage?\n\nThis will lock the public registration link while you revise essentials.`;
    } else {
      confirmMsg = `Are you sure you want to change the lifecycle stage of "${selectedYatra.name}" to ${targetStage}?`;
    }

    if (!window.confirm(confirmMsg)) {
      return;
    }

    try {
      const updated = await db.updateYatra(selectedYatra.id, { status: targetStage });
      setSelectedYatra(updated);
      setRefreshTrigger(prev => prev + 1);

      const actor = getCurrentActor();
      await recordAudit({
        yatraId: selectedYatra.id,
        yatraTitle: selectedYatra.name,
        category: 'Yatra Settings',
        action: 'STAGE_CHANGED',
        details: `${actor.name} (${actor.phone || actor.email}) changed Yatra lifecycle stage from "${selectedYatra.status}" to "${targetStage}".`,
        metadata: { fromStage: selectedYatra.status, toStage: targetStage }
      });
    } catch (err) {
      alert("Failed to update Yatra stage: " + err.message);
    }
  };

  const handlePurgeSandbox = async (sandboxYatraId) => {
    if (window.confirm("Are you sure you want to purge and delete this Sandbox Test Yatra? All mock devotees, buses, hotels, and rooms in this sandbox will be permanently deleted.")) {
      try {
        // 1. Delete all participants of this sandbox
        const parts = await db.getParticipants(sandboxYatraId);
        for (const p of parts) {
          await db.deleteParticipant(p.id);
        }
        // 2. Delete all buses of this sandbox
        const bList = await db.getBuses(sandboxYatraId);
        for (const b of bList) {
          await db.deleteBus(b.id);
        }
        // 3. Delete all hotels & rooms of this sandbox
        const hList = await db.getHotels(sandboxYatraId);
        for (const h of hList) {
          await db.deleteHotel(h.id);
        }
        const rList = await db.getRooms(sandboxYatraId);
        for (const r of rList) {
          await db.deleteRoom(r.id);
        }
        // 4. Delete all payments & expenses of this sandbox
        const payList = await db.getPayments(sandboxYatraId);
        for (const pay of payList) {
          await db.deletePayment(pay.id);
        }
        const expList = await db.getExpenses(sandboxYatraId);
        for (const exp of expList) {
          await db.deleteExpense(exp.id);
        }
        // 5. Delete the yatra record
        await db.deleteYatra(sandboxYatraId);

        if (selectedYatra?.id === sandboxYatraId) {
          setSelectedYatra(null);
          navigateTo('dashboard');
        }
        setRefreshTrigger(prev => prev + 1);
        alert("✨ Sandbox Test Yatra and all mock data purged successfully!");
      } catch (err) {
        console.error("Purge error:", err);
        alert("Encountered an issue purging sandbox data. Please refresh.");
      }
    }
  };

  const handleCreateSandboxYatra = async () => {
    const sandboxId = 'sandbox_' + Date.now();
    
    // 1. Create Sandbox Yatra
    const sandboxYatra = {
      id: sandboxId,
      name: '🧪 [Sandbox Simulation] Vrindavan Yatra',
      destination: 'Vrindavan, Mathura',
      startDate: '2026-10-15',
      endDate: '2026-10-19',
      expectedParticipants: 30,
      pricePerPerson: '3500',
      customQrImageUrl: '',
      upiId: 'rohit.wadhwani83@okaxis',
      upiName: 'Rohit Wadhwani',
      registrationDeadline: '2026-10-10',
      status: 'confirmed',
      isSandbox: true,
      sandboxExpiresAt: Date.now() + 4 * 60 * 60 * 1000, // 4 hours auto-expiry safety net
      createdAt: new Date().toISOString()
    };
    await db.addYatra(sandboxYatra);

    // 2. Create 2 Realistic Buses for Bin-Packing Auto-Allocation Test
    const bus1 = {
      id: 'bus_sb1_' + sandboxId,
      yatraId: sandboxId,
      name: 'Bus 1 (AC Video Coach)',
      busNumber: 'MH 02 AB 1008',
      route: 'Mumbai Central -> Dadar -> Vrindavan',
      capacity: 15,
      coordinatorName: 'Arjuna Das',
      coordinatorPhone: '9811122233',
      driverName: 'Ramu Bhai',
      driverPhone: '9822233344',
      departureTime: '05:30 AM',
      boardingPoint: 'Mumbai Central Station Platform 1 Gate',
      status: 'active'
    };
    const bus2 = {
      id: 'bus_sb2_' + sandboxId,
      yatraId: sandboxId,
      name: 'Bus 2 (Deluxe AC Sleeper)',
      busNumber: 'MH 04 CD 2009',
      route: 'Borivali -> Thane -> Vrindavan',
      capacity: 15,
      coordinatorName: 'Krishna Kanta Das',
      coordinatorPhone: '9833344455',
      driverName: 'Shyam Sharma',
      driverPhone: '9844455566',
      departureTime: '06:00 AM',
      boardingPoint: 'Borivali National Park Flyover Gate',
      status: 'active'
    };
    await db.addBus(bus1);
    await db.addBus(bus2);

    // 3. Create 2 Hotels
    const hotel1Id = 'hotel_sb1_' + sandboxId;
    const hotel1 = {
      id: hotel1Id,
      yatraId: sandboxId,
      name: 'MVT Bhaktivedanta Ashram',
      address: 'Raman Reti, Near ISKCON, Vrindavan',
      gmapsLink: 'https://maps.google.com/?q=MVT+Vrindavan',
      bookingLink: '',
      contactPerson: 'Govinda Das',
      phone: '9876501111',
      roomsAvailable: 5,
      roomPrice: 2400,
      extraMattressCost: 500,
      distanceFromTemple: '2 mins walk to ISKCON',
      notes: 'Pure sattvic environment, AC rooms with power backup',
      contacted: true,
      shortlisted: true,
      finalSelected: true
    };
    const hotel2Id = 'hotel_sb2_' + sandboxId;
    const hotel2 = {
      id: hotel2Id,
      yatraId: sandboxId,
      name: 'Radha Raman Guesthouse',
      address: 'Near Radha Raman Temple, Vrindavan',
      gmapsLink: '',
      bookingLink: '',
      contactPerson: 'Murari Lal Sharma',
      phone: '9876502222',
      roomsAvailable: 4,
      roomPrice: 1800,
      extraMattressCost: 400,
      distanceFromTemple: '5 mins to Bankey Bihari',
      notes: 'Clean heritage rooms near old town',
      contacted: true,
      shortlisted: true,
      finalSelected: true
    };
    await db.addHotel(hotel1);
    await db.addHotel(hotel2);

    // 4. Create Diverse Rooms with bedCount and mattress options across both hotels
    const mockRooms = [
      // MVT Ashram Rooms
      { id: 'rm_101_' + sandboxId, yatraId: sandboxId, hotelId: hotel1Id, hotelName: hotel1.name, roomNumber: '101', roomType: 'Twin Bed (2 Beds)', bedCount: 2, capacity: 2, extraMattressAllowed: 1, floor: 'Ground Floor' },
      { id: 'rm_102_' + sandboxId, yatraId: sandboxId, hotelId: hotel1Id, hotelName: hotel1.name, roomNumber: '102', roomType: 'Twin Bed (2 Beds)', bedCount: 2, capacity: 2, extraMattressAllowed: 0, floor: 'Ground Floor' },
      { id: 'rm_103_' + sandboxId, yatraId: sandboxId, hotelId: hotel1Id, hotelName: hotel1.name, roomNumber: '103', roomType: 'Triple Bed (3 Beds)', bedCount: 3, capacity: 3, extraMattressAllowed: 1, floor: '1st Floor' },
      { id: 'rm_104_' + sandboxId, yatraId: sandboxId, hotelId: hotel1Id, hotelName: hotel1.name, roomNumber: '104', roomType: 'Family Quad (4 Beds)', bedCount: 4, capacity: 4, extraMattressAllowed: 1, floor: '1st Floor' },
      { id: 'rm_105_' + sandboxId, yatraId: sandboxId, hotelId: hotel1Id, hotelName: hotel1.name, roomNumber: '105', roomType: '5-Bed Family Suite', bedCount: 5, capacity: 5, extraMattressAllowed: 2, floor: '2nd Floor' },
      
      // Radha Raman Guesthouse Rooms
      { id: 'rm_201_' + sandboxId, yatraId: sandboxId, hotelId: hotel2Id, hotelName: hotel2.name, roomNumber: '201', roomType: 'Twin Bed (2 Beds)', bedCount: 2, capacity: 2, extraMattressAllowed: 0, floor: 'Ground Floor' },
      { id: 'rm_202_' + sandboxId, yatraId: sandboxId, hotelId: hotel2Id, hotelName: hotel2.name, roomNumber: '202', roomType: 'Twin Bed (2 Beds)', bedCount: 2, capacity: 2, extraMattressAllowed: 1, floor: 'Ground Floor' },
      { id: 'rm_203_' + sandboxId, yatraId: sandboxId, hotelId: hotel2Id, hotelName: hotel2.name, roomNumber: '203', roomType: 'Triple Bed (3 Beds)', bedCount: 3, capacity: 3, extraMattressAllowed: 1, floor: '1st Floor' },
      { id: 'rm_204_' + sandboxId, yatraId: sandboxId, hotelId: hotel2Id, hotelName: hotel2.name, roomNumber: '204', roomType: 'Family Quad (4 Beds)', bedCount: 4, capacity: 4, extraMattressAllowed: 0, floor: '1st Floor' },
    ];
    for (const r of mockRooms) {
      await db.addRoom(r);
    }

    // 5. Create 22 Mock Devotees with diverse family structures, ages, and travel modes
    const mockDevotees = [
      // Family of 5 (Can fit in 5-bed suite Room 105 or 3-bed + 2-bed)
      {
        id: 'p_sb1_' + sandboxId,
        yatraId: sandboxId,
        name: 'Ramesh Sharma',
        phone: '9820111222',
        email: 'ramesh.sharma@example.com',
        location: 'Mumbai',
        type: 'family',
        familyName: 'Sharma Family',
        membersCount: 5,
        familyMembers: [
          { name: 'Ramesh Sharma', relation: 'Self', age: 48, phone: '9820111222' },
          { name: 'Sunita Sharma', relation: 'Spouse', age: 45, phone: '' },
          { name: 'Rahul Sharma', relation: 'Son', age: 22, phone: '' },
          { name: 'Pooja Sharma', relation: 'Daughter', age: 17, phone: '' },
          { name: 'Kaushalya Devi', relation: 'Mother', age: 72, phone: '' }
        ],
        memberDetails: 'Ramesh (48), Sunita (45), Rahul (22), Pooja (17), Kaushalya (72)',
        travelMode: 'organised',
        status: 'confirmed',
        paymentStatus: 'completed',
        isSandboxData: true
      },
      // Family of 4 with a toddler under 5 yrs traveling free
      {
        id: 'p_sb2_' + sandboxId,
        yatraId: sandboxId,
        name: 'Gaurav Kulkarni',
        phone: '9820222333',
        email: 'gaurav.k@example.com',
        location: 'Pune',
        type: 'family',
        familyName: 'Kulkarni Family',
        membersCount: 4,
        familyMembers: [
          { name: 'Gaurav Kulkarni', relation: 'Self', age: 39, phone: '9820222333' },
          { name: 'Sneha Kulkarni', relation: 'Spouse', age: 36, phone: '' },
          { name: 'Aarav Kulkarni', relation: 'Son', age: 9, phone: '' },
          { name: 'Ananya Kulkarni', relation: 'Daughter', age: 3, phone: '' }
        ],
        memberDetails: 'Gaurav (39), Sneha (36), Aarav (9), Ananya (3)',
        travelMode: 'organised',
        status: 'confirmed',
        paymentStatus: 'completed',
        isSandboxData: true
      },
      // Family of 3
      {
        id: 'p_sb3_' + sandboxId,
        yatraId: sandboxId,
        name: 'Sanjay Gupta',
        phone: '9820333444',
        email: 'sanjay.gupta@example.com',
        location: 'Delhi',
        type: 'family',
        familyName: 'Gupta Family',
        membersCount: 3,
        familyMembers: [
          { name: 'Sanjay Gupta', relation: 'Self', age: 56, phone: '9820333444' },
          { name: 'Anita Gupta', relation: 'Spouse', age: 52, phone: '' },
          { name: 'Vikas Gupta', relation: 'Son', age: 26, phone: '' }
        ],
        memberDetails: 'Sanjay (56), Anita (52), Vikas (26)',
        travelMode: 'organised',
        status: 'confirmed',
        paymentStatus: 'partially_paid',
        isSandboxData: true
      },
      // Married Couple (2 pax)
      {
        id: 'p_sb4_' + sandboxId,
        yatraId: sandboxId,
        name: 'Vikram Patel',
        phone: '9820444555',
        email: 'vikram.p@example.com',
        location: 'Ahmedabad',
        type: 'family',
        familyName: 'Patel Couple',
        membersCount: 2,
        familyMembers: [
          { name: 'Vikram Patel', relation: 'Self', age: 32, phone: '9820444555' },
          { name: 'Meera Patel', relation: 'Spouse', age: 30, phone: '' }
        ],
        memberDetails: 'Vikram (32), Meera (30)',
        travelMode: 'organised',
        status: 'confirmed',
        paymentStatus: 'completed',
        isSandboxData: true
      },
      // Family of 3 with Self Travel by Train (Tests that they are excluded from bus auto-allocation)
      {
        id: 'p_sb5_' + sandboxId,
        yatraId: sandboxId,
        name: 'Rajesh Verma',
        phone: '9820555666',
        email: 'rajesh.v@example.com',
        location: 'Delhi',
        type: 'family',
        familyName: 'Verma Family',
        membersCount: 3,
        familyMembers: [
          { name: 'Rajesh Verma', relation: 'Self', age: 45, phone: '9820555666' },
          { name: 'Kavita Verma', relation: 'Spouse', age: 42, phone: '' },
          { name: 'Rohit Verma', relation: 'Son', age: 14, phone: '' }
        ],
        memberDetails: 'Rajesh (45), Kavita (42), Rohit (14)',
        travelMode: 'self',
        travelType: 'rail',
        boardingStation: 'New Delhi (NDLS)',
        droppingStation: 'Mathura Junction (MTJ)',
        status: 'confirmed',
        paymentStatus: 'completed',
        isSandboxData: true
      },
      // Individual Devotees
      {
        id: 'p_sb6_' + sandboxId,
        yatraId: sandboxId,
        name: 'Amitabh Sen',
        phone: '9820666777',
        email: 'amitabh.sen@example.com',
        location: 'Kolkata',
        type: 'individual',
        membersCount: 1,
        familyMembers: [{ name: 'Amitabh Sen', relation: 'Self', age: 29, phone: '9820666777' }],
        memberDetails: 'Amitabh (29)',
        travelMode: 'organised',
        status: 'confirmed',
        paymentStatus: 'completed',
        isSandboxData: true
      },
      {
        id: 'p_sb7_' + sandboxId,
        yatraId: sandboxId,
        name: 'Radha Devi',
        phone: '9820777888',
        email: 'radha.devi@example.com',
        location: 'Varanasi',
        type: 'individual',
        membersCount: 1,
        familyMembers: [{ name: 'Radha Devi', relation: 'Self', age: 64, phone: '9820777888' }],
        memberDetails: 'Radha Devi (64)',
        travelMode: 'organised',
        status: 'confirmed',
        paymentStatus: 'completed',
        isSandboxData: true
      },
      {
        id: 'p_sb8_' + sandboxId,
        yatraId: sandboxId,
        name: 'Mohit Joshi',
        phone: '9820888999',
        email: 'mohit.j@example.com',
        location: 'Jaipur',
        type: 'individual',
        membersCount: 1,
        familyMembers: [{ name: 'Mohit Joshi', relation: 'Self', age: 35, phone: '9820888999' }],
        memberDetails: 'Mohit (35)',
        travelMode: 'organised',
        status: 'confirmed',
        paymentStatus: 'completed',
        isSandboxData: true
      },
      {
        id: 'p_sb9_' + sandboxId,
        yatraId: sandboxId,
        name: 'Pooja Nair',
        phone: '9820999000',
        email: 'pooja.nair@example.com',
        location: 'Bengaluru',
        type: 'individual',
        membersCount: 1,
        familyMembers: [{ name: 'Pooja Nair', relation: 'Self', age: 27, phone: '9820999000' }],
        memberDetails: 'Pooja (27)',
        travelMode: 'organised',
        status: 'confirmed',
        paymentStatus: 'completed',
        isSandboxData: true
      },
      {
        id: 'p_sb10_' + sandboxId,
        yatraId: sandboxId,
        name: 'Suresh Mehta',
        phone: '9821000111',
        email: 'suresh.m@example.com',
        location: 'Surat',
        type: 'individual',
        membersCount: 1,
        familyMembers: [{ name: 'Suresh Mehta', relation: 'Self', age: 51, phone: '9821000111' }],
        memberDetails: 'Suresh (51)',
        travelMode: 'self',
        travelType: 'road',
        status: 'confirmed',
        paymentStatus: 'pending',
        isSandboxData: true
      }
    ];

    for (const dev of mockDevotees) {
      await db.addParticipant(dev);
    }

    // Refresh state and navigate directly into the Sandbox Yatra
    setRefreshTrigger(prev => prev + 1);
    setSelectedYatra(sandboxYatra);
    navigateTo('yatra', sandboxId);
    alert("🎉 Sandbox Test Yatra created successfully with 22 test devotees, 2 buses, and 9 hotel rooms! You are now in the sandbox environment.");
  };

  const handleDeleteYatra = async (yatraId) => {
    const targetYatra = yatras.find(y => y.id === yatraId);
    if (targetYatra?.isSandbox) {
      return handlePurgeSandbox(yatraId);
    }
    if (window.confirm("Are you sure you want to delete this Yatra? It will be archived.")) {
      const actor = getCurrentActor();
      await db.softDeleteYatra(yatraId);
      await recordAudit({
        yatraId,
        yatraTitle: targetYatra?.name || 'Yatra',
        category: 'Yatra Settings',
        action: 'YATRA_DELETED',
        details: `${actor.name} (${actor.phone || actor.email}) deleted and archived Yatra "${targetYatra?.name || yatraId}".`,
        metadata: { yatraId }
      });
      if (selectedYatra?.id === yatraId) {
        setSelectedYatra(null);
        navigateTo('dashboard');
      }
      setRefreshTrigger(prev => prev + 1);
    }
  };

  const handleRestoreYatra = async (yatraId) => {
    if (window.confirm("Restore this Yatra to active status?")) {
      const targetYatra = yatras.find(y => y.id === yatraId);
      const actor = getCurrentActor();
      await db.restoreYatra(yatraId);
      await recordAudit({
        yatraId,
        yatraTitle: targetYatra?.name || 'Yatra',
        category: 'Yatra Settings',
        action: 'YATRA_RESTORED',
        details: `${actor.name} (${actor.phone || actor.email}) restored archived Yatra "${targetYatra?.name || yatraId}" back to active status.`,
        metadata: { yatraId }
      });
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

  // Mobile phone duplicate detection helper for the active Yatra
  const getExistingYatraParticipantByPhone = (phone, excludeParticipantId = null) => {
    if (!phone || !selectedYatra || !participants) return null;
    const clean = phone.replace(/[^0-9]/g, '').slice(-10);
    if (clean.length < 10) return null;
    return participants.find(p => 
      p.yatraId === selectedYatra.id && 
      (!excludeParticipantId || p.id !== excludeParticipantId) && 
      (p.phone || '').replace(/[^0-9]/g, '').slice(-10) === clean
    );
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

  const handleOpenEditParticipant = (part) => {
    setEditingParticipantId(part.id);
    const members = part.familyMembers && Array.isArray(part.familyMembers) && part.familyMembers.length > 0
      ? JSON.parse(JSON.stringify(part.familyMembers))
      : (part.type === 'individual' 
          ? [{ name: part.name || '', relation: 'Self', age: '', phone: part.phone || '' }] 
          : [{ name: part.name || '', relation: 'Self', age: '', phone: part.phone || '' }]);

    setNewParticipant({
      name: part.name || '',
      phone: part.phone || '',
      email: part.email || '',
      location: part.location || '',
      type: part.type || 'individual',
      familyName: part.familyName || '',
      membersCount: part.membersCount || members.length || 1,
      familyMembers: members,
      memberDetails: part.memberDetails || '',
      travelMode: part.travelMode || 'organised',
      travelType: part.travelType || '',
      boardingStation: part.boardingStation || '',
      droppingStation: part.droppingStation || '',
      remarks: part.remarks || '',
      status: part.status || 'interested',
      paymentStatus: part.paymentStatus || 'pending',
      approvalStatus: part.approvalStatus || (isDevoteeApproved(part) ? 'approved' : 'pending'),
      isApproved: isDevoteeApproved(part),
      customPrice: part.customPrice || '',
      busId: part.busId || '',
      busName: part.busName || '',
      busNumber: part.busNumber || '',
      roomId: part.roomId || '',
      roomNumber: part.roomNumber || '',
      hotelName: part.hotelName || '',
      hotelId: part.hotelId || ''
    });
    setAdminAutoFilledDevotee(null);
    setIsAddParticipantOpen(true);
  };

  const handleDeleteParticipant = async (participantId, participantName) => {
    if (window.confirm(`Are you sure you want to delete registration for ${participantName || 'this devotee'}? This will remove them from participants, bus, and room lists.`)) {
      const actor = getCurrentActor();
      await db.deleteParticipant(participantId);
      await recordAudit({
        yatraId: selectedYatra?.id,
        yatraTitle: selectedYatra?.name,
        category: 'Participants',
        action: 'PARTICIPANT_DELETED',
        details: `${actor.name} (${actor.phone || actor.email}) deleted registration for devotee "${participantName || participantId}".`,
        metadata: { participantId, participantName }
      });
      setRefreshTrigger(prev => prev + 1);
    }
  };

  const handleApproveEligibility = async (participant) => {
    const actor = getCurrentActor();
    await db.updateParticipant(participant.id, {
      approvalStatus: 'approved',
      isApproved: true
    });
    await recordAudit({
      yatraId: selectedYatra?.id,
      yatraTitle: selectedYatra?.name,
      category: 'Participants',
      action: 'ELIGIBILITY_APPROVED',
      details: `${actor.name} (${actor.phone || actor.email}) approved Yatra eligibility for ${participant.name} (Mobile: ${participant.phone || 'N/A'}). Payment options unlocked.`,
      metadata: { participantId: participant.id }
    });
    setRefreshTrigger(prev => prev + 1);
  };

  const handleRevokeEligibility = async (participant) => {
    if (window.confirm(`Revoke Yatra eligibility approval for ${participant.name || 'this devotee'}? This will lock payment options for them.`)) {
      const actor = getCurrentActor();
      await db.updateParticipant(participant.id, {
        approvalStatus: 'pending',
        isApproved: false
      });
      await recordAudit({
        yatraId: selectedYatra?.id,
        yatraTitle: selectedYatra?.name,
        category: 'Participants',
        action: 'ELIGIBILITY_REVOKED',
        details: `${actor.name} (${actor.phone || actor.email}) revoked Yatra eligibility for ${participant.name} (Mobile: ${participant.phone || 'N/A'}). Payment options locked.`,
        metadata: { participantId: participant.id }
      });
      setRefreshTrigger(prev => prev + 1);
    }
  };

  const handleApproveAllPending = async () => {
    const pendingParticipants = participants.filter(p => !isDevoteeApproved(p));
    if (pendingParticipants.length === 0) return;
    if (window.confirm(`Approve all ${pendingParticipants.length} pending devotee registration(s) for ${selectedYatra?.name || 'this Yatra'}? This will enable payment options for all of them.`)) {
      const actor = getCurrentActor();
      for (const p of pendingParticipants) {
        await db.updateParticipant(p.id, {
          approvalStatus: 'approved',
          isApproved: true
        });
      }
      await recordAudit({
        yatraId: selectedYatra?.id,
        yatraTitle: selectedYatra?.name,
        category: 'Participants',
        action: 'BULK_ELIGIBILITY_APPROVED',
        details: `${actor.name} (${actor.phone || actor.email}) bulk-approved Yatra eligibility for ${pendingParticipants.length} pending devotee registrations.`,
        metadata: { count: pendingParticipants.length }
      });
      setRefreshTrigger(prev => prev + 1);
    }
  };

  const handleAddParticipant = async (e) => {
    e.preventDefault();
    const cleanPhone = (newParticipant.phone || '').replace(/[^0-9]/g, '').slice(-10);
    if (cleanPhone && cleanPhone.length === 10) {
      const duplicate = getExistingYatraParticipantByPhone(newParticipant.phone, editingParticipantId);
      if (duplicate) {
        alert(`Duplicate Mobile Number: Devotee "${duplicate.name}" is already registered in this Yatra with mobile number +91 ${cleanPhone}. Each devotee/family registration in this Yatra must have a unique mobile number.`);
        return;
      }
    }
    if (newParticipant.type === 'family' && (!newParticipant.familyMembers || newParticipant.familyMembers.length === 0)) {
      alert("Please add at least one family member (including the primary devotee) before registering.");
      return;
    }
    const memberDetails = newParticipant.type === 'family' && newParticipant.familyMembers && newParticipant.familyMembers.length > 0
      ? newParticipant.familyMembers.map(m => `${m.name}${m.age ? ` (${m.age})` : ''}`).join(', ')
      : newParticipant.memberDetails || '';

    const membersCount = newParticipant.type === 'family' && newParticipant.familyMembers && newParticipant.familyMembers.length > 0
      ? newParticipant.familyMembers.length
      : (newParticipant.membersCount || 1);

    const isAppr = newParticipant.approvalStatus === 'approved' || newParticipant.isApproved === true;
    const nowIso = new Date().toISOString();
    const partToSave = { 
      ...newParticipant, 
      memberDetails,
      membersCount,
      approvalStatus: isAppr ? 'approved' : 'pending',
      isApproved: isAppr,
      yatraId: selectedYatra.id,
      registeredAt: newParticipant.registeredAt || newParticipant.createdAt || nowIso,
      createdAt: newParticipant.createdAt || newParticipant.registeredAt || nowIso
    };

    const actor = getCurrentActor();
    if (editingParticipantId) {
      await db.updateParticipant(editingParticipantId, partToSave);
      await recordAudit({
        yatraId: selectedYatra.id,
        yatraTitle: selectedYatra.name,
        category: 'Participants',
        action: 'PARTICIPANT_UPDATED',
        details: `${actor.name} (${actor.phone || actor.email}) updated devotee registration for ${partToSave.name} (Mobile: ${partToSave.phone}, ${partToSave.type === 'family' ? `Family of ${partToSave.membersCount}` : 'Individual'}).`,
        metadata: { participantId: editingParticipantId }
      });
      setEditingParticipantId(null);
    } else {
      await db.addParticipant(partToSave);
      await db.saveDevoteeProfile(newParticipant);
      await recordAudit({
        yatraId: selectedYatra.id,
        yatraTitle: selectedYatra.name,
        category: 'Participants',
        action: 'PARTICIPANT_MANUALLY_ADDED',
        details: `${actor.name} (${actor.phone || actor.email}) manually registered devotee ${partToSave.name} (Mobile: ${partToSave.phone}, ${partToSave.type === 'family' ? `Family of ${partToSave.membersCount}` : 'Individual'}).`,
        metadata: { participantId: partToSave.id }
      });
    }
    setIsAddParticipantOpen(false);
    setAdminAutoFilledDevotee(null);
    setNewParticipant({ name: '', phone: '', email: '', location: '', type: 'individual', familyName: '', membersCount: 1, familyMembers: [], memberDetails: '', travelMode: 'organised', travelType: '', boardingStation: '', droppingStation: '', remarks: '', status: 'interested', paymentStatus: 'pending', approvalStatus: 'pending', isApproved: false });
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
    let hotelName = newRoom.hotelName;
    let hotelId = newRoom.hotelId;

    if (newRoom.isCustomHotel && newRoom.customHotelName) {
      hotelName = newRoom.customHotelName;
      // Auto-register this hotel in hotels collection if not already existing
      const existing = hotels.find(h => h.name.toLowerCase() === hotelName.toLowerCase());
      if (existing) {
        hotelId = existing.id;
      } else {
        hotelId = 'h_' + Math.random().toString(36).substring(2, 9);
        await db.addHotel({
          id: hotelId,
          yatraId: selectedYatra.id,
          name: hotelName,
          address: newRoom.customHotelAddress || selectedYatra.destination,
          gmapsLink: '',
          bookingLink: '',
          contactPerson: newRoom.customHotelContact || '',
          phone: newRoom.customHotelPhone || '',
          roomsAvailable: 10,
          roomPrice: 2000,
          extraMattressCost: newRoom.extraMattressCost || 500,
          distanceFromTemple: '',
          notes: 'Added from Room Inventory',
          contacted: true,
          shortlisted: true,
          finalSelected: true,
          quoteImageUrl: ''
        });
      }
    } else {
      const match = hotels.find(h => h.id === hotelId || h.name === hotelName);
      if (match) {
        hotelId = match.id;
        hotelName = match.name;
      } else if (!hotelName) {
        const firstBooked = hotels.find(h => h.finalSelected) || hotels[0];
        hotelName = firstBooked ? firstBooked.name : 'Primary Hotel';
        hotelId = firstBooked ? firstBooked.id : '';
      }
    }

    const bedCount = parseInt(newRoom.bedCount) || parseInt(newRoom.capacity) || 2;
    const roomPayload = {
      ...newRoom,
      bedCount,
      capacity: bedCount,
      extraMattressAllowed: parseInt(newRoom.extraMattressAllowed) || 0,
      extraMattressCost: parseInt(newRoom.extraMattressCost) || 500,
      hotelName,
      hotelId
    };

    if (editingRoomId) {
      await db.updateRoom(editingRoomId, roomPayload);
    } else {
      const id = 'rm_' + Math.random().toString(36).substring(2, 9);
      await db.addRoom({ ...roomPayload, id, yatraId: selectedYatra.id });
    }
    setIsAddRoomOpen(false);
    setEditingRoomId(null);
    setNewRoom({ 
      roomNumber: '', 
      roomType: 'Twin Bed (2 Beds)', 
      bedCount: 2, 
      capacity: 2, 
      extraMattressAllowed: 0,
      floor: 'Ground Floor', 
      hotelName: '', 
      hotelId: '', 
      extraMattressCost: 500, 
      notes: '', 
      isCustomHotel: false, 
      customHotelName: '', 
      customHotelAddress: '', 
      customHotelContact: '', 
      customHotelPhone: '' 
    });
    setRefreshTrigger(prev => prev + 1);
  };

  const handleDeleteRoom = async (roomId) => {
    if (window.confirm("Delete this room? Devotees assigned to this room will become unallocated.")) {
      await db.deleteRoom(roomId);
      for (const p of participants) {
        let needsUpdate = false;
        const updateData = {};
        if (p.roomId === roomId) {
          needsUpdate = true;
          updateData.roomId = '';
          updateData.roomNumber = '';
          updateData.hotelName = '';
          updateData.hotelId = '';
        }
        if (p.familyMembers && p.familyMembers.some(m => (m.roomId || p.roomId) === roomId)) {
          needsUpdate = true;
          updateData.familyMembers = p.familyMembers.map(m => {
            const curR = m.roomId !== undefined ? m.roomId : p.roomId;
            return curR === roomId ? { ...m, roomId: '', roomNumber: '', hotelName: '', hotelId: '' } : m;
          });
        }
        if (needsUpdate) {
          await db.updateParticipant(p.id, updateData);
        }
      }
      setRefreshTrigger(prev => prev + 1);
    }
  };

  // Reassign whole participant / family to a room (or unassign if roomId === '')
  const handleReassignRoom = async (participantId, roomId) => {
    const p = participants.find(x => x.id === participantId);
    if (!p) return;

    if (!roomId) {
      const updatedMembers = p.familyMembers ? p.familyMembers.map(m => ({
        ...m,
        roomId: '',
        roomNumber: '',
        hotelName: '',
        hotelId: ''
      })) : [];
      await db.updateParticipant(participantId, {
        roomId: '',
        roomNumber: '',
        hotelName: '',
        hotelId: '',
        ...(p.familyMembers ? { familyMembers: updatedMembers } : {})
      });
    } else {
      const rm = rooms.find(r => r.id === roomId);
      if (rm) {
        const updatedMembers = p.familyMembers ? p.familyMembers.map(m => ({
          ...m,
          roomId: rm.id,
          roomNumber: rm.roomNumber,
          hotelName: rm.hotelName,
          hotelId: rm.hotelId || ''
        })) : [];
        await db.updateParticipant(participantId, {
          roomId: rm.id,
          roomNumber: rm.roomNumber,
          hotelName: rm.hotelName,
          hotelId: rm.hotelId || '',
          ...(p.familyMembers ? { familyMembers: updatedMembers } : {})
        });
      }
    }
    setRefreshTrigger(prev => prev + 1);
  };

  // Reassign an individual family member to any room (or unassign)
  const handleReassignMemberRoom = async (participantId, memberIndex, roomId) => {
    const p = participants.find(x => x.id === participantId);
    if (!p || !p.familyMembers || memberIndex === null || memberIndex === undefined) return;

    const updatedMembers = [...p.familyMembers];
    const targetMember = updatedMembers[memberIndex];
    if (!targetMember) return;

    let newRoomId = '';
    let newRoomNumber = '';
    let newHotelName = '';
    let newHotelId = '';

    if (roomId) {
      const rm = rooms.find(r => r.id === roomId);
      if (rm) {
        newRoomId = rm.id;
        newRoomNumber = rm.roomNumber;
        newHotelName = rm.hotelName;
        newHotelId = rm.hotelId || '';
      }
    }

    updatedMembers[memberIndex] = {
      ...targetMember,
      roomId: newRoomId,
      roomNumber: newRoomNumber,
      hotelName: newHotelName,
      hotelId: newHotelId
    };

    // If primary devotee (memberIndex === 0 or relation === 'Self'), also update parent record
    const updateData = { familyMembers: updatedMembers };
    if (memberIndex === 0 || targetMember.relation === 'Self') {
      updateData.roomId = newRoomId;
      updateData.roomNumber = newRoomNumber;
      updateData.hotelName = newHotelName;
      updateData.hotelId = newHotelId;
    }

    await db.updateParticipant(participantId, updateData);
    setRefreshTrigger(prev => prev + 1);
  };

  // Smart Auto-Allocation considering bed counts, family matching, and same-hotel multi-room splits
  const autoAllocateRooms = async () => {
    if (!rooms || rooms.length === 0) {
      alert("Please add room inventory for your booked hotels before running auto-allocation.");
      return;
    }

    const devotees = participants.filter(p => p.status === 'confirmed' || p.status === 'interested');
    if (devotees.length === 0) {
      alert("No participants found to allocate rooms for.");
      return;
    }

    // Build tracking inventory of rooms with accurate bedCount
    const roomTracker = rooms.map(r => {
      const beds = parseInt(r.bedCount) || parseInt(r.capacity) || 2;
      return {
        id: r.id,
        roomNumber: r.roomNumber,
        roomType: r.roomType || 'Standard Room',
        floor: r.floor || 'Floor',
        hotelName: r.hotelName,
        hotelId: r.hotelId || '',
        bedCount: beds,
        remainingBeds: beds,
        extraMattressAllowed: parseInt(r.extraMattressAllowed) || 0,
        occupants: []
      };
    });

    const families = devotees.filter(p => p.type === 'family');
    const individuals = devotees.filter(p => p.type !== 'family');

    // Sort families descending by size so larger families get dedicated suites first
    families.sort((a, b) => {
      const sizeA = (a.familyMembers && a.familyMembers.length) || a.membersCount || 1;
      const sizeB = (b.familyMembers && b.familyMembers.length) || b.membersCount || 1;
      return sizeB - sizeA;
    });

    const participantUpdates = [];
    let unallocatedDevoteeCount = 0;

    // 1. Allocate Families
    for (const fam of families) {
      const members = (fam.familyMembers && fam.familyMembers.length > 0)
        ? [...fam.familyMembers]
        : [{ name: fam.name, relation: 'Self', age: '', phone: fam.phone }];
      const famSize = members.length;

      // STEP 1A: Look for an empty room that fits the entire family (e.g. 5-bed room for family of 5)
      const exactEmptyRooms = roomTracker
        .filter(r => r.occupants.length === 0 && r.remainingBeds >= famSize)
        .sort((a, b) => a.remainingBeds - b.remainingBeds);

      if (exactEmptyRooms.length > 0) {
        const chosen = exactEmptyRooms[0];
        chosen.remainingBeds -= famSize;

        const updatedMembers = members.map(m => {
          chosen.occupants.push({ name: m.name, famId: fam.id });
          return {
            ...m,
            roomId: chosen.id,
            roomNumber: chosen.roomNumber,
            hotelName: chosen.hotelName,
            hotelId: chosen.hotelId
          };
        });

        participantUpdates.push({
          id: fam.id,
          data: {
            roomId: chosen.id,
            roomNumber: chosen.roomNumber,
            hotelName: chosen.hotelName,
            hotelId: chosen.hotelId,
            familyMembers: updatedMembers
          }
        });
        continue;
      }

      // STEP 1B: Multi-Room Split in the SAME Hotel (e.g. 3-bed + 2-bed twin room for family of 5)
      const hotelNames = Array.from(new Set(roomTracker.map(r => r.hotelName)));
      let allocatedInSameHotel = false;

      for (const hName of hotelNames) {
        const hotelAvailableRooms = roomTracker
          .filter(r => r.hotelName === hName && r.remainingBeds > 0)
          .sort((a, b) => {
            if (a.occupants.length === 0 && b.occupants.length > 0) return -1;
            if (b.occupants.length === 0 && a.occupants.length > 0) return 1;
            return b.remainingBeds - a.remainingBeds;
          });

        const totalHotelBeds = hotelAvailableRooms.reduce((sum, r) => sum + r.remainingBeds, 0);
        if (totalHotelBeds >= famSize) {
          let memberIdx = 0;
          const updatedMembers = [...members];
          const assignedRooms = [];

          for (const r of hotelAvailableRooms) {
            if (memberIdx >= famSize) break;
            const bedsToTake = Math.min(r.remainingBeds, famSize - memberIdx);
            for (let i = 0; i < bedsToTake; i++) {
              const m = updatedMembers[memberIdx];
              updatedMembers[memberIdx] = {
                ...m,
                roomId: r.id,
                roomNumber: r.roomNumber,
                hotelName: r.hotelName,
                hotelId: r.hotelId
              };
              r.occupants.push({ name: m.name, famId: fam.id });
              memberIdx++;
            }
            r.remainingBeds -= bedsToTake;
            assignedRooms.push(r);
          }

          participantUpdates.push({
            id: fam.id,
            data: {
              roomId: assignedRooms[0]?.id || '',
              roomNumber: assignedRooms[0]?.roomNumber || '',
              hotelName: assignedRooms[0]?.hotelName || '',
              hotelId: assignedRooms[0]?.hotelId || '',
              familyMembers: updatedMembers
            }
          });
          allocatedInSameHotel = true;
          break;
        }
      }

      if (allocatedInSameHotel) continue;

      // STEP 1C: General Fallback Split across any available rooms
      const anyAvailableRooms = roomTracker.filter(r => r.remainingBeds > 0).sort((a, b) => b.remainingBeds - a.remainingBeds);
      const totalRemaining = anyAvailableRooms.reduce((sum, r) => sum + r.remainingBeds, 0);

      if (totalRemaining >= famSize) {
        let memberIdx = 0;
        const updatedMembers = [...members];
        const assignedRooms = [];

        for (const r of anyAvailableRooms) {
          if (memberIdx >= famSize) break;
          const bedsToTake = Math.min(r.remainingBeds, famSize - memberIdx);
          for (let i = 0; i < bedsToTake; i++) {
            const m = updatedMembers[memberIdx];
            updatedMembers[memberIdx] = {
              ...m,
              roomId: r.id,
              roomNumber: r.roomNumber,
              hotelName: r.hotelName,
              hotelId: r.hotelId
            };
            r.occupants.push({ name: m.name, famId: fam.id });
            memberIdx++;
          }
          r.remainingBeds -= bedsToTake;
          assignedRooms.push(r);
        }

        participantUpdates.push({
          id: fam.id,
          data: {
            roomId: assignedRooms[0]?.id || '',
            roomNumber: assignedRooms[0]?.roomNumber || '',
            hotelName: assignedRooms[0]?.hotelName || '',
            hotelId: assignedRooms[0]?.hotelId || '',
            familyMembers: updatedMembers
          }
        });
      } else {
        // Not enough beds
        unallocatedDevoteeCount += famSize;
        const updatedMembers = members.map(m => ({
          ...m,
          roomId: '',
          roomNumber: '',
          hotelName: '',
          hotelId: ''
        }));
        participantUpdates.push({
          id: fam.id,
          data: {
            roomId: '',
            roomNumber: '',
            hotelName: '',
            hotelId: '',
            familyMembers: updatedMembers
          }
        });
      }
    }

    // 2. Allocate Individuals into remaining beds in twin / triple / quad rooms
    for (const ind of individuals) {
      const availableRoom = roomTracker.find(r => r.remainingBeds > 0);
      if (availableRoom) {
        availableRoom.remainingBeds -= 1;
        availableRoom.occupants.push({ name: ind.name, indId: ind.id });
        participantUpdates.push({
          id: ind.id,
          data: {
            roomId: availableRoom.id,
            roomNumber: availableRoom.roomNumber,
            hotelName: availableRoom.hotelName,
            hotelId: availableRoom.hotelId
          }
        });
      } else {
        unallocatedDevoteeCount += 1;
        participantUpdates.push({
          id: ind.id,
          data: {
            roomId: '',
            roomNumber: '',
            hotelName: '',
            hotelId: ''
          }
        });
      }
    }

    // Save updates
    for (const u of participantUpdates) {
      await db.updateParticipant(u.id, u.data);
    }

    setRoomAllocationApproved(false);
    setRefreshTrigger(prev => prev + 1);

    if (unallocatedDevoteeCount > 0) {
      alert(`Room allocation completed! ${devotees.length - unallocatedDevoteeCount} devotees placed across booked hotel rooms. Notice: ${unallocatedDevoteeCount} devotee beds could not be accommodated. Please add more rooms across your booked accommodations.`);
    } else {
      alert(`🎉 Smart room allocation successful! All ${devotees.length} devotees have been allocated rooms matching their bed counts (with families kept together in suites or split into rooms at the same hotel). You can manually fine-tune any room or individual family member below.`);
    }
  };

  const sendRoomWhatsApp = (participant, currentRoom, hotel) => {
    if (!participant || !participant.phone) return;
    const phone = participant.phone.replace(/[^0-9]/g, '');
    const cleanPhone = phone.startsWith('91') && phone.length === 12 ? phone : (phone.length === 10 ? '91' + phone : phone);

    // Collect all room allocations for this devotee / family
    const allocatedRooms = [];
    if (participant.type === 'family' && participant.familyMembers && participant.familyMembers.length > 0) {
      const roomMap = {};
      participant.familyMembers.forEach(m => {
        const rId = m.roomId !== undefined && m.roomId !== '' ? m.roomId : participant.roomId;
        if (rId) {
          if (!roomMap[rId]) {
            const rObj = rooms.find(r => r.id === rId);
            roomMap[rId] = {
              room: rObj,
              hotel: hotels.find(h => h.id === rObj?.hotelId || h.name === rObj?.hotelName) || {},
              members: []
            };
          }
          roomMap[rId].members.push(m.name);
        }
      });
      Object.values(roomMap).forEach(v => allocatedRooms.push(v));
    } else if (participant.roomId) {
      const rObj = rooms.find(r => r.id === participant.roomId);
      allocatedRooms.push({
        room: rObj,
        hotel: hotel || hotels.find(h => h.id === rObj?.hotelId || h.name === rObj?.hotelName) || {},
        members: [participant.name]
      });
    }

    let roomDetailsText = '';
    if (allocatedRooms.length === 0 && currentRoom) {
      const hotelObj = hotel || hotels.find(h => h.id === currentRoom.hotelId || h.name === currentRoom.hotelName) || {};
      roomDetailsText = `*Hotel / Guesthouse:* ${hotelObj.name || currentRoom.hotelName}\n*Room Number:* ${currentRoom.roomNumber} (${currentRoom.roomType || 'Standard Room'}, ${currentRoom.floor || 'Floor 1'})\n*Allocated For:* ${participant.name}`;
    } else {
      roomDetailsText = allocatedRooms.map((ar, idx) => {
        const r = ar.room;
        const h = ar.hotel;
        return `📌 *Room Pass ${idx + 1}: Room ${r?.roomNumber || 'TBD'}* (${r?.roomType || 'Room'}, ${r?.floor || 'Floor'})\n*Hotel:* ${h.name || r?.hotelName || 'Yatra Accommodation'}\n*Occupants:* ${ar.members.join(', ')}`;
      }).join('\n\n');
    }

    const primaryHotel = allocatedRooms[0]?.hotel || hotel || {};
    const text = `🏨 *Hare Krishna ${participant.name}!* \n\nHere are your official *Hotel Room & Stay Details* for *${selectedYatra.name}*:\n\n${roomDetailsText}\n\n*Hotel Address:* ${primaryHotel.address || selectedYatra.destination}\n${primaryHotel.gmapsLink ? `*Google Maps Link:* ${primaryHotel.gmapsLink}\n` : ''}👤 *Hotel Reception/Contact:* ${primaryHotel.contactPerson || 'Reception'} (${primaryHotel.phone || ''})\n\nYou can also check your live room pass anytime in your devotee portal:\n👉 ${window.location.href.split('#')[0]}#/login\n\nHaribol! 🙏`;

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
    const actor = getCurrentActor();
    await recordAudit({
      yatraId: selectedYatra.id,
      yatraTitle: selectedYatra.name,
      category: 'Expenses',
      action: 'EXPENSE_ADDED',
      details: `${actor.name} (${actor.phone || actor.email}) recorded expense of ₹${exp.amount.toLocaleString()} for "${exp.category.toUpperCase()}". Paid by: ${exp.paidBy || 'Organizer'}. Remarks: ${exp.remarks || 'None'}.`,
      metadata: { amount: exp.amount, category: exp.category, paidBy: exp.paidBy }
    });
    setIsAddExpenseOpen(false);
    setNewExpense({ date: new Date().toISOString().split('T')[0], category: 'hotel', amount: '', paidBy: '', remarks: '', appliesTo: 'everyone', targetIds: [], billImageUrl: '' });
    setRefreshTrigger(prev => prev + 1);
  };

  const handleDeleteExpense = async (exp) => {
    if (window.confirm(`Delete expense of ₹${exp.amount?.toLocaleString()} (${exp.category})?`)) {
      await db.deleteExpense(exp.id);
      const actor = getCurrentActor();
      await recordAudit({
        yatraId: selectedYatra?.id,
        yatraTitle: selectedYatra?.name,
        category: 'Expenses',
        action: 'EXPENSE_DELETED',
        details: `${actor.name} (${actor.phone || actor.email}) deleted expense of ₹${exp.amount?.toLocaleString()} (${exp.category.toUpperCase()}, Paid by: ${exp.paidBy || 'Organizer'}).`,
        metadata: { expenseId: exp.id, amount: exp.amount }
      });
      setRefreshTrigger(prev => prev + 1);
    }
  };

  // Image upload handler with intelligent client-side canvas compression (prevents LocalStorage QuotaExceeded errors)
  const handleImageUpload = (file, callback) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const maxDim = 1200;
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Compress to JPEG with 0.8 quality
          const compressed = canvas.toDataURL('image/jpeg', 0.8);
          callback(compressed);
        } catch (err) {
          // Fallback to uncompressed dataURL if canvas fails
          callback(reader.result);
        }
      };
      img.onerror = () => {
        callback(reader.result);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  // --- Public Participant Actions ---
  const handlePublicRegister = async (e) => {
    e.preventDefault();
    const cleanPhone = (newParticipant.phone || '').replace(/[^0-9]/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10) {
      alert(t('enterValid10DigitPhone') || "Please enter a valid 10-digit mobile number.");
      return;
    }
    const duplicate = getExistingYatraParticipantByPhone(newParticipant.phone);
    if (duplicate) {
      alert(
        (t('phoneAlreadyRegisteredAlert') || "This mobile number is already registered for this Yatra under: ") +
        `"${duplicate.name}".\n\nTo prevent duplicate registrations, multiple submissions with the same phone number are not permitted. Please log into your Devotee Portal using this mobile number to view your registration status.`
      );
      return;
    }
    if (newParticipant.type === 'family' && (!newParticipant.familyMembers || newParticipant.familyMembers.length === 0)) {
      alert("Please add at least one family member (including yourself) in the list before proceeding.");
      return;
    }

    // Verify Yatra target capacity limit
    const targetCapacity = parseInt(selectedYatra.expectedParticipants) || 0;
    if (targetCapacity > 0) {
      const freshParticipants = await db.getParticipants(selectedYatra.id);
      const currentSeats = (freshParticipants || [])
        .filter(p => !p.isDeleted)
        .reduce((sum, p) => sum + (p.type === 'family' ? (p.membersCount || p.familyMembers?.length || 1) : 1), 0);
      const incomingSeats = newParticipant.type === 'family' ? (newParticipant.familyMembers?.length || newParticipant.membersCount || 1) : 1;
      
      if (currentSeats >= targetCapacity || currentSeats + incomingSeats > targetCapacity) {
        alert(t('registrationCapacityFullMessage') || "The registration for this yatra has reached full capacity. Please reach out to admins for further assistance. Hare Krishna!");
        setRefreshTrigger(prev => prev + 1);
        return;
      }
    }

    const pId = 'part_' + Math.random().toString(36).substring(2, 9);
    const participantRecord = {
      ...newParticipant,
      id: pId,
      yatraId: selectedYatra.id,
      status: 'interested',
      approvalStatus: 'pending',
      isApproved: false,
      paymentStatus: 'pending',
      registeredAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    await db.addParticipant(participantRecord);
    await db.saveDevoteeProfile(participantRecord);
    await recordAudit({
      yatraId: selectedYatra.id,
      yatraTitle: selectedYatra.name,
      category: 'Participants',
      action: 'DEVOTEE_REGISTERED',
      details: `Devotee "${participantRecord.name}" (Mobile: ${participantRecord.phone}) registered online for ${selectedYatra.name} (${participantRecord.type === 'family' ? `Family of ${participantRecord.membersCount}` : 'Individual'}).`,
      actorOverride: {
        id: participantRecord.id,
        name: participantRecord.name,
        phone: participantRecord.phone,
        email: participantRecord.email || '',
        role: 'devotee'
      },
      metadata: { participantId: participantRecord.id, membersCount: participantRecord.membersCount }
    });
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
      transactionRef: publicPayMethod === 'upi' ? publicPayRef : 'CASH PAYMENT PROMISED',
      paymentDate: publicPayDate,
      screenshotUrl: publicPayMethod === 'upi' ? publicPayScreenshot : '',
      status: 'pending_verification'
    });
    // Update participant payment status and cash promise details
    const partUpdates = { 
      paymentStatus: 'pending',
      paymentMethodPreference: publicPayMethod 
    };
    if (publicPayMethod === 'cash') {
      partUpdates.cashPromiseDate = publicPayDate;
      partUpdates.cashPromiseAmount = parseFloat(publicPayAmount);
    }
    await db.updateParticipant(currentRoute.id, partUpdates);
    await recordAudit({
      yatraId: selectedYatra.id,
      yatraTitle: selectedYatra.name,
      category: 'Payments',
      action: 'PAYMENT_SUBMITTED',
      details: `Devotee "${paymentParticipant?.name || 'Devotee'}" (Mobile: ${paymentParticipant?.phone || ''}) submitted payment proof of ₹${publicPayAmount} via ${publicPayMethod.toUpperCase()} (Ref: ${publicPayMethod === 'upi' ? publicPayRef : 'Cash Promised'}).`,
      actorOverride: {
        id: paymentParticipant?.id || '',
        name: paymentParticipant?.name || 'Devotee',
        phone: paymentParticipant?.phone || '',
        email: paymentParticipant?.email || '',
        role: 'devotee'
      },
      metadata: { amount: publicPayAmount, paymentMethod: publicPayMethod }
    });
    setPublicPayStatus('success');
  };

  // Devotee submits/updates cash promise directly from Devotee Portal
  const handleDevoteeSubmitCashPromise = async (e, defaultFee = 0) => {
    e.preventDefault();
    if (!devoteeCashPromiseDate) {
      alert("Please select your promised payment date.");
      return;
    }
    const enteredAmount = parseFloat(devoteeCashPromiseAmount);
    const cleanAmount = !isNaN(enteredAmount) ? enteredAmount : (defaultFee > 0 ? defaultFee : 0);
    if (!cleanAmount || cleanAmount <= 0) {
      alert("Please enter a valid payment amount greater than ₹0.");
      return;
    }
    const updates = {
      cashPromiseDate: devoteeCashPromiseDate,
      cashPromiseAmount: cleanAmount,
      cashPromiseNotes: devoteeCashPromiseNotes,
      paymentMethodPreference: 'cash',
      paymentStatus: 'pending'
    };
    const updated = await db.updateParticipant(myParticipantData.id, updates);
    await recordAudit({
      yatraId: selectedYatra.id,
      yatraTitle: selectedYatra.name,
      category: 'Payments',
      action: 'CASH_PROMISED',
      details: `Devotee "${myParticipantData.name}" (Mobile: ${myParticipantData.phone}) promised cash contribution of ₹${cleanAmount.toLocaleString()} by ${devoteeCashPromiseDate}. Handover Notes: ${devoteeCashPromiseNotes || 'None'}.`,
      actorOverride: {
        id: myParticipantData.id,
        name: myParticipantData.name,
        phone: myParticipantData.phone,
        email: myParticipantData.email || '',
        role: 'devotee'
      },
      metadata: { promisedAmount: cleanAmount, promiseDate: devoteeCashPromiseDate, notes: devoteeCashPromiseNotes }
    });
    setMyParticipantData(updated);
    setRefreshTrigger(prev => prev + 1);
    alert(`Hare Krishna! Your commitment to pay ₹${cleanAmount.toLocaleString()} in cash by ${devoteeCashPromiseDate} has been recorded. The organizers will verify upon receiving the cash.`);
  };

  // Admin 1-click Receive Cash & Confirm
  const handleAdminReceiveCash = async (part, defaultAmount = 0) => {
    const amountStr = window.prompt(`Confirm Cash Collection for ${part.name}:\nEnter cash amount received (₹):`, defaultAmount > 0 ? defaultAmount.toString() : '0');
    if (amountStr === null) return;
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }
    const payId = 'pay_' + Math.random().toString(36).substring(2, 9);
    await db.addPayment({
      id: payId,
      yatraId: selectedYatra.id,
      participantId: part.id,
      amountPaid: amount,
      paymentMethod: 'cash',
      transactionRef: 'CASH RECEIVED BY ORGANIZER',
      paymentDate: new Date().toISOString().split('T')[0],
      screenshotUrl: '',
      status: 'verified'
    });
    const splitInfo = expCalc.splits.find(s => s.id === part.id);
    const totalDue = splitInfo ? splitInfo.share : defaultAmount;
    const alreadyPaid = (splitInfo ? splitInfo.paid : 0) + amount;
    const newPayStatus = alreadyPaid >= totalDue ? 'completed' : 'partially_paid';
    await db.updateParticipant(part.id, {
      paymentStatus: newPayStatus,
      status: 'confirmed',
      cashReceivedDate: new Date().toISOString()
    });
    const actor = getCurrentActor();
    await recordAudit({
      yatraId: selectedYatra.id,
      yatraTitle: selectedYatra.name,
      category: 'Payments',
      action: 'CASH_COLLECTED',
      details: `${actor.name} (${actor.phone || actor.email}) recorded & verified cash received of ₹${amount.toLocaleString()} from devotee "${part.name}" (Mobile: ${part.phone}).`,
      metadata: { participantId: part.id, amount, paymentMethod: 'cash' }
    });
    setRefreshTrigger(prev => prev + 1);
    alert(`✓ Successfully recorded cash payment of ₹${amount.toLocaleString()} for ${part.name}!`);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!editProfileData || !myParticipantData) return;

    const isFamily = editProfileData.type === 'family';
    let familyMembers = [];
    if (isFamily) {
      familyMembers = (editProfileData.familyMembers || []).filter(m => m && m.name && m.name.trim().length > 0);
      if (familyMembers.length === 0) {
        alert("Please add at least one member in your family group (including yourself).");
        return;
      }
    } else {
      familyMembers = [{
        name: editProfileData.name,
        relation: 'Self',
        age: (editProfileData.familyMembers && editProfileData.familyMembers[0]?.age) || '',
        phone: editProfileData.phone || ''
      }];
    }

    const membersCount = isFamily ? familyMembers.length : 1;
    const memberDetails = isFamily
      ? familyMembers.map(m => `${m.name}${m.age ? ` (${m.age})` : ''}`).join(', ')
      : `${editProfileData.name} (Self)`;

    const dataToSave = {
      ...editProfileData,
      type: isFamily ? 'family' : 'individual',
      familyName: isFamily ? (editProfileData.familyName || `${editProfileData.name} Family`) : '',
      familyMembers,
      membersCount,
      memberDetails,
      location: editProfileData.location || editProfileData.city || '',
      city: editProfileData.location || editProfileData.city || ''
    };

    // Remove obsolete dietary and medical fields
    delete dataToSave.specialRequirements;
    delete dataToSave.medicalNotes;

    const updated = await db.updateParticipant(myParticipantData.id, dataToSave);
    await db.saveDevoteeProfile(dataToSave);
    await recordAudit({
      yatraId: selectedYatra?.id || 'global',
      yatraTitle: selectedYatra?.name || 'Devotee Profile',
      category: 'Participants',
      action: 'DEVOTEE_PROFILE_UPDATED',
      details: `Devotee "${dataToSave.name}" (Mobile: ${dataToSave.phone}) updated profile details (${isFamily ? `Family Group with ${membersCount} members: ${memberDetails}` : 'Individual'}). Location: ${dataToSave.location || 'N/A'}.`,
      actorOverride: {
        id: myParticipantData.id,
        name: dataToSave.name,
        phone: dataToSave.phone,
        email: dataToSave.email || '',
        role: 'devotee'
      },
      metadata: { membersCount, familyName: dataToSave.familyName, location: dataToSave.location }
    });
    setMyParticipantData(updated);
    setIsEditProfileOpen(false);
    alert("✓ Profile updated successfully!");
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
    const actor = getCurrentActor();
    const targetPart = participants.find(p => p.id === participantId);
    await recordAudit({
      yatraId: selectedYatra?.id,
      yatraTitle: selectedYatra?.name,
      category: 'Payments',
      action: 'PAYMENT_VERIFIED',
      details: `${actor.name} (${actor.phone || actor.email}) updated payment verification status to "${status}" for devotee "${targetPart?.name || participantId}" (Mobile: ${targetPart?.phone || 'N/A'}).`,
      metadata: { paymentId, participantId, status }
    });
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
      case 'interest_received':
        text = `🙏 *Hare Krishna ${participant.name}!* \n\nThank you for submitting your interest for the sacred *${selectedYatra.name}* to *${selectedYatra.destination}* (${selectedYatra.startDate} to ${selectedYatra.endDate}).\n\n📋 *Registration Status:* Received & Under Organizer Review\n\n📌 *Details:*\n- Type: ${participant.type === 'family' ? `Family Group (${participant.familyName || participant.name})` : 'Individual Traveller'}\n- Registered Members: ${participant.membersCount || 1}\n\nOur Yatra organizing team is reviewing registrations. Once your eligibility is approved, payment options will be activated in your Devotee Portal:\n👉 ${portalUrl}\n\nHaribol! 🙏`;
        break;
      case 'eligibility_approved':
        text = `🎉 *Hare Krishna ${participant.name}!* \n\nWonderful news! Your registration eligibility for *${selectedYatra.name}* to *${selectedYatra.destination}* has been *APPROVED* by the organizers! ✅\n\n💳 *Payment Options Activated:*\nYou can now complete your Yatra contribution and confirm your seats via UPI or Cash:\n👉 ${paymentUrl}\n\nUPI ID: *${selectedYatra.upiId}* (${selectedYatra.upiName})\nTotal Contribution: ₹${totalDue.toLocaleString('en-IN')}\n\nDevotee Portal: ${portalUrl}\n\nHaribol! 🙏`;
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

  const handleDeletePhoto = async (photoId) => {
    if (!window.confirm("Are you sure you want to permanently delete this photo? It will be removed immediately from both Admin and Devotee galleries.")) {
      return;
    }
    const targetPhoto = (photos && photos.find(p => p.id === photoId)) || (myPhotos && myPhotos.find(p => p.id === photoId));
    // Optimistic UI update: instantly remove from screen
    setPhotos(prev => prev.filter(p => p.id !== photoId));
    setMyPhotos(prev => prev.filter(p => p.id !== photoId));

    try {
      await db.deletePhoto(photoId);
      const actor = getCurrentActor();
      await recordAudit({
        yatraId: selectedYatra?.id,
        yatraTitle: selectedYatra?.name,
        category: 'Gallery',
        action: 'PHOTO_DELETED',
        details: `${actor.name} (${actor.phone || actor.email}) deleted photo from Yatra gallery (Uploader: ${targetPhoto?.uploader || 'Unknown'}, ID: ${photoId}).`,
        metadata: { photoId, uploader: targetPhoto?.uploader }
      });
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error("Failed to delete photo:", err);
      alert("Failed to delete photo: " + err.message);
      setRefreshTrigger(prev => prev + 1);
    }
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
    const headers = ['Registration ID', 'Family/Group Name', 'Member Name', 'Relation', 'Age', 'Phone', 'Email', 'Location', 'Travel Mode', 'Travel Type', 'Boarding Station', 'Dropping Station', 'Eligibility', 'Status', 'Payment Status', 'Remarks'];
    
    const rows = [];
    participants.forEach(p => {
      const splitData = expCalc.splits.find(s => s.id === p.id);
      const payStatus = splitData?.dynamicPaymentStatus || p.paymentStatus;
      const devoteeStatus = (payStatus === 'completed' && p.status === 'interested') ? 'confirmed' : (splitData?.dynamicDevoteeStatus || p.status);
      const isApproved = isDevoteeApproved(p);
      const eligibilityStatus = p.approvalStatus === 'rejected' ? 'Rejected' : (isApproved ? 'Approved' : 'Pending Approval');

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
            eligibilityStatus,
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
          eligibilityStatus,
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

  // Helper to generate a direct magic invite link that auto-activates admin on any recipient device
  const generateAdminInviteUrl = (user) => {
    try {
      const payload = {
        id: user.id || undefined,
        email: user.email,
        name: user.name || 'Yatra Administrator',
        phone: user.phone || '',
        password: user.password,
        role: user.role || 'admin',
        mustChangePassword: user.mustChangePassword !== false,
        t: Date.now()
      };
      const token = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
      return `${window.location.origin}${window.location.pathname}#/login?invite=${token}`;
    } catch (e) {
      return `${window.location.origin}${window.location.pathname}#/login`;
    }
  };

  // --- Admin Management (Super Admin) ---
  const handleAddAdmin = async (e) => {
    e.preventDefault();
    if (!newAdminEmail.trim()) return;

    const email = newAdminEmail.trim().toLowerCase();
    if (systemUsers.some(u => u.email.toLowerCase() === email)) {
      alert("An administrator with this email already exists.");
      return;
    }

    const tempPassword = newAdminTempPassword.trim() || 'YatraAdmin@2026';
    const adminRecord = {
      email,
      role: 'admin',
      name: newAdminName.trim() || 'Yatra Administrator',
      phone: newAdminPhone.trim() || '',
      password: tempPassword,
      mustChangePassword: true,
      createdAt: new Date().toISOString()
    };

    const added = await db.addUser(adminRecord);
    await recordAudit({
      yatraId: 'global',
      yatraTitle: 'Super Admin Access',
      category: 'Admin Access',
      action: 'ADMIN_INVITED',
      details: `Super Admin invited secondary administrator "${adminRecord.name}" (Email: ${adminRecord.email}, Mobile: ${adminRecord.phone || 'N/A'}).`,
      metadata: { adminEmail: adminRecord.email, adminName: adminRecord.name }
    });
    setCreatedAdminSuccess({
      ...added,
      loginUrl: generateAdminInviteUrl(added)
    });
    setNewAdminEmail('');
    setNewAdminName('');
    setNewAdminPhone('');
    setNewAdminTempPassword('YatraAdmin@2026');
    setRefreshTrigger(prev => prev + 1);
  };

  const handleResetAdminPassword = async (adminUser) => {
    const tempPassword = 'YatraAdmin@' + Math.floor(1000 + Math.random() * 9000);
    if (window.confirm(`Reset password for ${adminUser.name} (${adminUser.email}) to temporary password: ${tempPassword}?\n\nThe admin will be forced to change this to their own secret password upon first login.`)) {
      await db.updateUser(adminUser.id, {
        password: tempPassword,
        mustChangePassword: true,
        passwordUpdatedAt: new Date().toISOString()
      });
      await recordAudit({
        yatraId: 'global',
        yatraTitle: 'Super Admin Access',
        category: 'Admin Access',
        action: 'ADMIN_PASSWORD_RESET',
        details: `Super Admin reset temporary credentials for administrator "${adminUser.name}" (Email: ${adminUser.email}). First-login password change enforced.`,
        metadata: { adminEmail: adminUser.email }
      });
      const updatedAdmin = {
        ...adminUser,
        password: tempPassword,
        mustChangePassword: true
      };
      setCreatedAdminSuccess({
        ...updatedAdmin,
        loginUrl: generateAdminInviteUrl(updatedAdmin)
      });
      setRefreshTrigger(prev => prev + 1);
    }
  };

  const handleToggleAdminPasswordStatus = async (adminUser) => {
    const newMustChange = !adminUser.mustChangePassword;
    await db.updateUser(adminUser.id, {
      mustChangePassword: newMustChange,
      passwordUpdatedAt: new Date().toISOString()
    });
    setRefreshTrigger(prev => prev + 1);
  };

  const handleDeleteAdmin = async (id) => {
    if (window.confirm("Are you sure you want to completely remove this admin's access?")) {
      const targetAdmin = systemUsers.find(u => u.id === id);
      await db.deleteUser(id);
      await recordAudit({
        yatraId: 'global',
        yatraTitle: 'Super Admin Access',
        category: 'Admin Access',
        action: 'ADMIN_DELETED',
        details: `Super Admin deleted administrator access for "${targetAdmin?.name || 'Administrator'}" (Email: ${targetAdmin?.email || id}).`,
        metadata: { adminId: id, adminEmail: targetAdmin?.email }
      });
      setRefreshTrigger(prev => prev + 1);
    }
  };

  // --- Settings (Firebase Sync Config) ---
  const saveFirebaseSettings = (e) => {
    e.preventDefault();
    if (!isSuperAdmin) return;
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
    if (!isSuperAdmin) return;
    db.disableFirebase();
    setIsFirebaseConnected(false);
    setFirebaseConfig('');
    alert("Disconnected from Firebase. Using local storage.");
    setIsSettingsOpen(false);
    setRefreshTrigger(prev => prev + 1);
  };

  // --- Complete System Backup & Disaster Recovery ---
  const handleExportFullBackup = async () => {
    if (!isSuperAdmin) return;
    try {
      const backup = await db.getFullBackup();
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `Spiritual_Yatra_System_Backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      alert("✅ Full Database Backup downloaded successfully! Keep this JSON file in a safe location.");
    } catch (err) {
      alert("Failed to export database backup: " + err.message);
    }
  };

  const handleImportFullBackup = (e) => {
    if (!isSuperAdmin) return;
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!window.confirm("⚠️ WARNING: Restoring from a backup will overwrite current database records with the contents of this file. Do you wish to continue?")) {
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        await db.restoreFullBackup(parsed);
        alert("🎉 Database restored successfully from backup!");
        setIsSettingsOpen(false);
        setRefreshTrigger(prev => prev + 1);
      } catch (err) {
        alert("Failed to restore database. Ensure the file is a valid JSON backup. Error: " + err.message);
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  // --- Search Filtering Helpers ---
  const matchesParticipant = (part, q, qDigits) => {
    if (!q) return true;
    
    // 1. Direct string fields
    const directFields = [
      part.name,
      part.phone,
      part.email,
      part.location,
      part.city,
      part.familyName,
      part.memberDetails,
      part.remarks,
      part.specialRequirements,
      part.medicalNotes,
      part.boardingStation,
      part.droppingStation,
      part.travelMode,
      part.travelType,
      part.cashPromiseDate,
      part.cashPromiseNotes,
      part.cashPromiseAmount,
      part.status,
      part.paymentStatus,
      part.approvalStatus
    ];
    for (const f of directFields) {
      if (f !== undefined && f !== null && f.toString().toLowerCase().includes(q)) return true;
    }

    // 2. Phone digits comparison (strips '+', spaces, dashes, etc.)
    if (qDigits && qDigits.length >= 3) {
      if (part.phone && part.phone.toString().replace(/[^0-9]/g, '').includes(qDigits)) return true;
    }

    // 3. Nested family members roster search (name, relation, phone)
    if (part.familyMembers && Array.isArray(part.familyMembers)) {
      for (const m of part.familyMembers) {
        if (!m) continue;
        if (m.name && m.name.toString().toLowerCase().includes(q)) return true;
        if (m.relation && m.relation.toString().toLowerCase().includes(q)) return true;
        if (m.phone) {
          if (m.phone.toString().toLowerCase().includes(q)) return true;
          if (qDigits && qDigits.length >= 3 && m.phone.toString().replace(/[^0-9]/g, '').includes(qDigits)) return true;
        }
      }
    }

    // 4. Status keyword shortcuts
    const split = expCalc?.splits?.find(s => s.id === part.id);
    const dynamicPaymentStatus = split?.dynamicPaymentStatus || part.paymentStatus;
    const effectiveDevoteeStatus = (dynamicPaymentStatus === 'completed' && part.status === 'interested') ? 'confirmed' : (split?.dynamicDevoteeStatus || part.status);

    if (q === 'approved' && isDevoteeApproved(part)) return true;
    if ((q === 'pending' || q === 'pending approval') && !isDevoteeApproved(part)) return true;
    if ((q === 'unpaid' || q === 'registered unpaid') && dynamicPaymentStatus !== 'completed' && part.status !== 'cancelled') return true;
    if ((q === 'cash' || q === 'cash promised') && Boolean(part.cashPromiseDate)) return true;
    if (q === 'confirmed' && effectiveDevoteeStatus === 'confirmed') return true;
    if (q === 'interested' && effectiveDevoteeStatus === 'interested') return true;
    if ((q === 'paid' || q === 'fully paid' || q === 'completed') && dynamicPaymentStatus === 'completed') return true;
    if ((q === 'partially paid' || q === 'partial') && dynamicPaymentStatus === 'partially_paid') return true;

    // 5. Associated payments check (transaction ref, payment method, payment date)
    const devoteePayments = payments.filter(pay => pay.participantId === part.id);
    for (const pay of devoteePayments) {
      if (pay.transactionRef && pay.transactionRef.toString().toLowerCase().includes(q)) return true;
      if (pay.paymentMethod && pay.paymentMethod.toString().toLowerCase().includes(q)) return true;
      if (pay.amountPaid && pay.amountPaid.toString().includes(q)) return true;
    }

    return false;
  };

  const filterList = (list, keys, customMatcher) => {
    const q = (searchQuery || '').trim().toLowerCase();
    if (!q) return list;
    const qDigits = (searchQuery || '').replace(/[^0-9]/g, '');

    return list.filter(item => {
      if (customMatcher && customMatcher(item, q, qDigits)) return true;
      return keys.some(key => {
        const val = item[key];
        if (val === undefined || val === null) return false;
        if (typeof val === 'object') {
          if (Array.isArray(val)) {
            return val.some(elem => {
              if (typeof elem === 'object' && elem !== null) {
                return Object.values(elem).some(v => {
                  if (!v) return false;
                  const vStr = v.toString().toLowerCase();
                  if (vStr.includes(q)) return true;
                  if (qDigits && qDigits.length >= 3 && v.toString().replace(/[^0-9]/g, '').includes(qDigits)) return true;
                  return false;
                });
              }
              return elem && elem.toString().toLowerCase().includes(q);
            });
          }
          return JSON.stringify(val).toLowerCase().includes(q);
        }
        const valStr = val.toString().toLowerCase();
        if (valStr.includes(q)) return true;
        if (qDigits && qDigits.length >= 3 && (key === 'phone' || key.includes('phone') || key.includes('contact') || key.includes('Mobile'))) {
          const valDigits = val.toString().replace(/[^0-9]/g, '');
          if (valDigits.includes(qDigits)) return true;
        }
        return false;
      });
    });
  };

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setSearchQuery('');
  };

  // Render Logic
  return (
    <div className={`app-container ${!currentUser ? 'login-bg-theme' : ''}`}>
      {/* HEADER NAVBAR */}
      <header className="header">
        <div className="header-title-group" style={{ cursor: 'pointer' }} onClick={() => currentUser ? navigateTo('dashboard') : null}>
          <Compass className="logo-icon" />
          <div>
            <h1>{t('appName')}</h1>
            {currentUser && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Logged in as: <strong>{currentUser.name}</strong> ({currentUser.role})</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          {/* Universal Language Switcher Toggle */}
          <button 
            type="button"
            className="btn btn-outline" 
            style={{ padding: '0.4rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', fontWeight: 600, borderColor: 'var(--primary)', color: 'var(--primary)' }}
            onClick={() => toggleLanguage()}
            title="Switch Language / भाषा बदलें"
          >
            <Languages size={15} />
            <span>{lang === 'en' ? '🇮🇳 हिंदी' : '🇬🇧 English'}</span>
          </button>

          {currentUser && (
            <>
              {(currentUser.role === 'admin' || currentUser.role === 'super_admin') && (
                <>
                  <button 
                    className="btn btn-outline" 
                    style={{ padding: '0.45rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }} 
                    title="Change My Password"
                    onClick={() => {
                      setChangePasswordError('');
                      setCurrentChangePassword('');
                      setNewChangePassword('');
                      setConfirmChangePassword('');
                      setIsChangePasswordOpen(true);
                    }}
                  >
                    <Key size={14} /> Password
                  </button>
                  <button
                    className="btn btn-outline"
                    style={{ padding: '0.5rem' }}
                    title="Refresh Data"
                    onClick={() => setRefreshTrigger(prev => prev + 1)}
                  >
                    <RefreshCw size={18} />
                  </button>
                </>
              )}
              {isSuperAdmin && (
                <button 
                  type="button"
                  className="btn" 
                  style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '0.45rem', 
                    padding: '0.45rem 0.95rem', 
                    fontSize: '0.85rem', 
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    color: '#ffffff',
                    border: '1px solid #b45309',
                    borderRadius: 'var(--radius-sm)',
                    boxShadow: '0 2px 8px rgba(217, 119, 6, 0.4)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }} 
                  onClick={() => {
                    setIsAuditTrailOpen(true);
                    loadAuditLogs();
                  }}
                  title="Super Admin Audit Trail & Change Log"
                >
                  <ShieldCheck size={16} /> Audit Trail
                </button>
              )}
              {isSuperAdmin && (
                <button className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => setIsSettingsOpen(true)} title="Super Admin Settings">
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
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '65vh', padding: '1rem 0', width: '100%', boxSizing: 'border-box' }}>
            <div className="card login-card">
              <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', marginBottom: '0.65rem', boxShadow: '0 4px 12px hsla(24, 90%, 54%, 0.15)' }}>
                  <Compass size={34} />
                </div>
                <h2 style={{ fontSize: '1.55rem', fontWeight: 700, marginBottom: '0.25rem' }}>{t('hareKrishna')}</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>{t('loginHeading')}</p>
              </div>

              {loginInviteBanner && (
                <div style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)', border: '1px solid hsla(140,80%,45%,0.25)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.85rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <CheckCircle size={18} style={{ flexShrink: 0 }} />
                  <span>{loginInviteBanner}</span>
                </div>
              )}

              {loginError && (
                <div style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)', border: '1px solid hsla(350,80%,55%,0.2)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.85rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <AlertTriangle size={16} />
                  <span>{loginError}</span>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', backgroundColor: 'var(--bg)', borderRadius: 'var(--radius-sm)', padding: '0.25rem', marginBottom: '1.5rem', gap: '0.25rem' }}>
                <button 
                  type="button" 
                  className={`btn ${loginRole === 'admin' ? 'btn-primary' : ''}`} 
                  style={{ padding: '0.45rem 0.2rem', fontSize: '0.82rem', fontWeight: 600, background: loginRole === 'admin' ? '' : 'transparent', color: loginRole === 'admin' ? '' : 'var(--text-muted)', border: 'none', textAlign: 'center' }}
                  onClick={() => setLoginRole('admin')}
                >{t('tabAdmin')}</button>
                <button 
                  type="button" 
                  className={`btn ${loginRole === 'super_admin' ? 'btn-primary' : ''}`} 
                  style={{ padding: '0.45rem 0.2rem', fontSize: '0.82rem', fontWeight: 600, background: loginRole === 'super_admin' ? '' : 'transparent', color: loginRole === 'super_admin' ? '' : 'var(--text-muted)', border: 'none', textAlign: 'center' }}
                  onClick={() => setLoginRole('super_admin')}
                >{t('tabSuperAdmin')}</button>
                <button 
                  type="button" 
                  className={`btn ${loginRole === 'participant' ? 'btn-primary' : ''}`} 
                  style={{ padding: '0.45rem 0.2rem', fontSize: '0.82rem', fontWeight: 600, background: loginRole === 'participant' ? '' : 'transparent', color: loginRole === 'participant' ? '' : 'var(--text-muted)', border: 'none', textAlign: 'center' }}
                  onClick={() => setLoginRole('participant')}
                >{t('tabDevotee')}</button>
              </div>

              <form onSubmit={handleLogin} autoComplete="off">
                {loginRole === 'participant' ? (
                  <div className="form-group">
                    <label>{t('enterMobile')}</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <span style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.625rem', display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg)' }}>+91</span>
                      <input 
                        type="tel" 
                        className="form-control" 
                        autoComplete="off"
                        placeholder={t('mobilePlaceholder')}
                        value={loginPhone}
                        onChange={(e) => setLoginPhone(e.target.value)}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="form-group">
                      <label>{t('emailAddress') || 'Email Address or Mobile Number'}</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        autoComplete="off"
                        placeholder="e.g. admin@yatra.com or 9876543210"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.25rem' }}>
                        <label style={{ margin: 0 }}>{t('password')}</label>
                        <button 
                          type="button" 
                          onClick={() => {
                            setForgotPasswordEmail(loginEmail || '');
                            setForgotPasswordStatus('idle');
                            setForgotPasswordMsg('');
                            setGeneratedResetLink('');
                            navigateTo('forgot-password');
                          }}
                          style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.8rem', padding: 0, fontWeight: 500 }}
                        >
                          {t('forgotPassword')}
                        </button>
                      </div>
                      <div style={{ position: 'relative' }}>
                        <input 
                          type={showLoginPassword ? "text" : "password"} 
                          className="form-control" 
                          autoComplete="new-password"
                          style={{ paddingRight: '2.5rem' }}
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                        />
                        <button 
                          type="button" 
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                          style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                          title={showLoginPassword ? "Hide password" : "Show password"}
                        >
                          {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', padding: '0.75rem' }}>
                  {loginRole === 'participant' ? t('findRegistration') : t('signIn')}
                </button>

                {loginRole === 'participant' && (
                  <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                      Need help with registration or passes?
                    </div>
                    <a 
                      href="./guides/Devotee_Pilgrim_User_Guide.pdf"
                      target="_blank" 
                      rel="noreferrer" 
                      download="Devotee_Pilgrim_User_Guide.pdf"
                      style={{ fontSize: '0.82rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <FileText size={14} />
                      <span>{t('devoteeGuidePdf')}</span>
                    </a>
                  </div>
                )}
              </form>
            </div>
          </div>
        )}

        {/* ======================================= */}
        {/* VIEW: FORGOT PASSWORD */}
        {/* ======================================= */}
        {currentRoute.path === 'forgot-password' && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '65vh', padding: '1rem 0' }}>
            <div className="card login-card">
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'hsla(38, 92%, 50%, 0.12)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', marginBottom: '0.75rem' }}>
                  <Key size={30} />
                </div>
                <h2>Reset Admin Password</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  Enter your registered administrator email to generate a secure reset link.
                </p>
              </div>

              {forgotPasswordStatus === 'error' && (
                <div style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)', border: '1px solid hsla(350,80%,55%,0.2)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.85rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                  <span>{forgotPasswordMsg}</span>
                </div>
              )}

              {forgotPasswordStatus === 'success' ? (
                <div>
                  <div style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)', border: '1px solid hsla(142,70%,45%,0.2)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.88rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                    <CheckCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <strong>Account Verified!</strong>
                      <div>{forgotPasswordMsg}</div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Password Reset Link (Valid for 1 hour)</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input 
                        type="text" 
                        readOnly 
                        className="form-control" 
                        value={generatedResetLink} 
                        style={{ fontFamily: 'monospace', fontSize: '0.8rem', backgroundColor: 'var(--bg)' }}
                        onClick={(e) => e.target.select()}
                      />
                      <button 
                        type="button" 
                        className="btn btn-outline" 
                        style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                        onClick={() => {
                          navigator.clipboard.writeText(generatedResetLink);
                          setCopiedResetLink(true);
                          setTimeout(() => setCopiedResetLink(false), 2500);
                        }}
                      >
                        {copiedResetLink ? <CheckCircle size={15} color="var(--success)" /> : <Copy size={15} />}
                        {copiedResetLink ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '1.5rem' }}>
                    <button 
                      type="button" 
                      className="btn btn-primary" 
                      style={{ width: '100%', padding: '0.75rem' }}
                      onClick={() => {
                        const hashPart = generatedResetLink.split('#')[1] || '';
                        window.location.hash = hashPart;
                      }}
                    >
                      Open Password Reset Screen Now
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-outline" 
                      style={{ width: '100%' }}
                      onClick={() => navigateTo('login')}
                    >
                      Return to Sign In
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleForgotPasswordSubmit}>
                  <div className="form-group">
                    <label>Registered Admin Email Address</label>
                    <input 
                      type="email" 
                      required 
                      className="form-control" 
                      placeholder="e.g. admin@yatramanage.com"
                      value={forgotPasswordEmail}
                      onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    />
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', padding: '0.75rem' }}>
                    Generate Password Reset Link
                  </button>

                  <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
                    <button 
                      type="button" 
                      onClick={() => navigateTo('login')}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                      ← Back to Sign In
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* ======================================= */}
        {/* VIEW: RESET PASSWORD FORM */}
        {/* ======================================= */}
        {currentRoute.path === 'reset-password' && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '65vh', padding: '1rem 0' }}>
            <div className="card login-card">
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'hsla(38, 92%, 50%, 0.12)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', marginBottom: '0.75rem' }}>
                  <ShieldCheck size={30} />
                </div>
                <h2>Create New Password</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  {resetTokenUser ? `Setting up secure password for ${resetTokenUser.name || resetTokenUser.email}` : 'Secure Password Recovery'}
                </p>
              </div>

              {resetTokenStatus === 'invalid' ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)', border: '1px solid hsla(350,80%,55%,0.2)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                    <AlertTriangle size={24} style={{ margin: '0 auto 0.5rem', display: 'block' }} />
                    <strong>Invalid or Expired Reset Link</strong>
                    <div style={{ marginTop: '0.25rem', fontSize: '0.82rem' }}>This password reset link is invalid or has expired (links expire after 1 hour). Please request a new one.</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    <button type="button" className="btn btn-primary" onClick={() => navigateTo('forgot-password')} style={{ width: '100%' }}>
                      Request New Reset Link
                    </button>
                    <button type="button" className="btn btn-outline" onClick={() => navigateTo('login')} style={{ width: '100%' }}>
                      Back to Sign In
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleResetPasswordSubmit}>
                  {resetPasswordError && (
                    <div style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)', border: '1px solid hsla(350,80%,55%,0.2)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.85rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                      <span>{resetPasswordError}</span>
                    </div>
                  )}

                  <div className="form-group">
                    <label>New Password</label>
                    <div style={{ position: 'relative' }}>
                      <input 
                        type={showResetPassword ? "text" : "password"} 
                        required
                        className="form-control" 
                        autoComplete="new-password"
                        style={{ paddingRight: '2.5rem' }}
                        placeholder="At least 6 characters"
                        value={newResetPassword}
                        onChange={(e) => setNewResetPassword(e.target.value)}
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowResetPassword(!showResetPassword)}
                        style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                      >
                        {showResetPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Confirm New Password</label>
                    <input 
                      type={showResetPassword ? "text" : "password"} 
                      required
                      className="form-control" 
                      autoComplete="new-password"
                      placeholder="Repeat your new password"
                      value={confirmResetPassword}
                      onChange={(e) => setConfirmResetPassword(e.target.value)}
                    />
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', padding: '0.75rem' }}>
                    Save Password & Sign In
                  </button>

                  <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
                    <button 
                      type="button" 
                      onClick={() => navigateTo('login')}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                      ← Cancel and Return to Sign In
                    </button>
                  </div>
                </form>
              )}
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
              <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                {isSuperAdmin && (
                  <button 
                    type="button"
                    className="btn" 
                    style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '0.45rem', 
                      padding: '0.5rem 1rem', 
                      fontSize: '0.85rem', 
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      color: '#ffffff',
                      border: '1px solid #b45309',
                      borderRadius: 'var(--radius-sm)',
                      boxShadow: '0 2px 8px rgba(217, 119, 6, 0.4)',
                      cursor: 'pointer'
                    }} 
                    onClick={() => {
                      setIsAuditTrailOpen(true);
                      loadAuditLogs();
                    }}
                    title="Open Super Admin Audit Trail & Change Log"
                  >
                    <ShieldCheck size={18} /> Audit Trail
                  </button>
                )}
                <button 
                  type="button"
                  className="btn btn-outline" 
                  style={{ borderColor: '#8b5cf6', color: '#7c3aed', backgroundColor: 'hsla(260, 80%, 60%, 0.08)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                  onClick={handleCreateSandboxYatra}
                  title="Create an isolated Sandbox Yatra with mock devotees, buses & rooms for safe testing"
                >
                  <Sparkles size={16} /> 🧪 Create Sandbox Test Yatra
                </button>
                <button className="btn btn-primary" onClick={() => setIsCreateYatraOpen(true)}>
                  <Plus size={18} /> Create New Yatra
                </button>
              </div>
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
                            {yatra.isSandbox && (
                              <span className="badge" style={{ backgroundColor: '#ede9fe', color: '#7c3aed', border: '1px solid #c4b5fd', fontWeight: 'bold' }}>
                                🧪 Sandbox Test
                              </span>
                            )}
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
                          {yatra.isSandbox && (
                            <button 
                              type="button"
                              className="btn btn-outline btn-icon" 
                              style={{ borderColor: '#fca5a5', color: '#dc2626' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePurgeSandbox(yatra.id);
                              }}
                              title="1-Click Purge Sandbox Test Yatra"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
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
                  <hr style={{ borderColor: 'var(--border)' }} />
                  <div>
                    <h5>{t('userGuides')}</h5>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.65rem' }}>
                      {t('downloadGuidesDesc')}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <a 
                        href="./guides/Devotee_Pilgrim_User_Guide.pdf" 
                        target="_blank" 
                        rel="noreferrer" 
                        download="Devotee_Pilgrim_User_Guide.pdf"
                        className="btn btn-outline" 
                        style={{ fontSize: '0.8rem', padding: '0.45rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.45rem', justifyContent: 'flex-start', textDecoration: 'none' }}
                      >
                        <FileText size={15} color="var(--primary)" />
                        <span>{t('devoteeGuidePdf')}</span>
                      </a>
                      <a 
                        href="./guides/Admin_Organizer_Operations_Guide.pdf" 
                        target="_blank" 
                        rel="noreferrer" 
                        download="Admin_Organizer_Operations_Guide.pdf"
                        className="btn btn-outline" 
                        style={{ fontSize: '0.8rem', padding: '0.45rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.45rem', justifyContent: 'flex-start', textDecoration: 'none' }}
                      >
                        <BookOpen size={15} color="#2563eb" />
                        <span>{t('adminGuidePdf')}</span>
                      </a>
                    </div>
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
            {/* SANDBOX SIMULATION BANNER */}
            {selectedYatra.isSandbox && (
              <div style={{
                backgroundColor: '#f5f3ff',
                border: '1.5px solid #8b5cf6',
                borderRadius: 'var(--radius-md)',
                padding: '1rem 1.25rem',
                marginBottom: '1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem',
                flexWrap: 'wrap'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ backgroundColor: '#ede9fe', color: '#7c3aed', padding: '0.5rem', borderRadius: '50%', display: 'flex' }}>
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: '700', color: '#5b21b6', fontSize: '0.95rem' }}>
                      🧪 Active Test Simulation Sandbox
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#6d28d9', marginTop: '0.15rem' }}>
                      Isolated testing ground with 22 mock devotees, 2 buses, and 9 hotel rooms. Real production yatras are unaffected.
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button 
                    type="button"
                    className="btn btn-outline" 
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem', borderColor: '#8b5cf6', color: '#7c3aed', backgroundColor: '#fff', fontWeight: 600 }}
                    onClick={() => setActiveTab('bus_allocation')}
                  >
                    🚌 Test Bus Allocation
                  </button>
                  <button 
                    type="button"
                    className="btn btn-outline" 
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem', borderColor: '#8b5cf6', color: '#7c3aed', backgroundColor: '#fff', fontWeight: 600 }}
                    onClick={() => setActiveTab('room_allocation')}
                  >
                    🛏️ Test Room Allocation
                  </button>
                  <button 
                    type="button"
                    className="btn btn-danger" 
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem', backgroundColor: '#dc2626' }}
                    onClick={() => handlePurgeSandbox(selectedYatra.id)}
                    title="Permanently remove this sandbox test yatra and all its mock data in 1 click"
                  >
                    <Trash2 size={13} /> Purge Sandbox (1-Click)
                  </button>
                </div>
              </div>
            )}

            {/* EXECUTIVE YATRA WORKSPACE HEADER */}
            <div className="yatra-workspace-header">
              {/* Top Sub-Bar: Navigation Breadcrumb + Administrative Tools */}
              <div className="yatra-header-top">
                <button 
                  type="button" 
                  className="btn-back-breadcrumb"
                  onClick={() => navigateTo('dashboard')}
                  title="Return to Yatras Dashboard"
                >
                  <ArrowLeft size={14} /> Back to Yatras
                </button>

                {(currentUser.role === 'admin' || currentUser.role === 'super_admin') && (
                  <div className="yatra-header-admin-tools">
                    <button 
                      type="button"
                      className="btn btn-outline" 
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
                      onClick={() => {
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
                      }}
                    >
                      <Edit2 size={13} /> Edit
                    </button>

                    {isSuperAdmin && (
                      <button 
                        type="button"
                        className="btn" 
                        style={{ 
                          padding: '0.35rem 0.65rem', 
                          fontSize: '0.78rem', 
                          fontWeight: 700, 
                          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', 
                          color: '#ffffff', 
                          border: '1px solid #b45309', 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '0.3rem', 
                          cursor: 'pointer' 
                        }}
                        onClick={() => {
                          setAuditYatraFilter(selectedYatra.id);
                          setIsAuditTrailOpen(true);
                          loadAuditLogs();
                        }}
                        title="View Audit Trail for this Yatra"
                      >
                        <ShieldCheck size={13} /> Audit Trail
                      </button>
                    )}

                    {!selectedYatra.isDeleted && (
                      <button 
                        type="button"
                        className="btn btn-outline" 
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem', color: '#dc2626', borderColor: '#fca5a5' }}
                        onClick={() => selectedYatra.isSandbox ? handlePurgeSandbox(selectedYatra.id) : handleDeleteYatra(selectedYatra.id)}
                        title={selectedYatra.isSandbox ? "Purge Sandbox Test Yatra" : "Delete this Yatra"}
                      >
                        <Trash2 size={13} /> {selectedYatra.isSandbox ? 'Purge Sandbox' : 'Delete'}
                      </button>
                    )}

                    {selectedYatra.isDeleted && currentUser.role === 'super_admin' && (
                      <button 
                        type="button"
                        className="btn btn-primary" 
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', backgroundColor: 'var(--success)' }} 
                        onClick={() => handleRestoreYatra(selectedYatra.id)}
                      >
                        <RefreshCw size={13} /> Restore
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Main Showcase Bar: Title, Metadata, Stage Controller & Primary Action Tools */}
              <div className="yatra-header-main">
                <div className="yatra-header-info">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                    <h2 className="yatra-title">{selectedYatra.name}</h2>
                  </div>
                  <div className="yatra-meta-badges">
                    <span className="yatra-meta-pill">
                      📍 {selectedYatra.destination}
                    </span>
                    <span className="yatra-meta-pill">
                      📅 {selectedYatra.startDate} to {selectedYatra.endDate}
                    </span>
                    {selectedYatra.expectedParticipants && (
                      <span className="yatra-meta-pill">
                        👥 {selectedYatra.expectedParticipants} Pilgrims Target
                      </span>
                    )}
                    {selectedYatra.pricePerPerson && (
                      <span className="yatra-meta-pill yatra-price-pill">
                        💰 ₹{parseFloat(selectedYatra.pricePerPerson).toLocaleString()} / seat
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Side: Interactive Lifecycle Controller & Actions */}
                <div className="yatra-header-actions">
                  <div className="yatra-stage-box">
                    <span className="yatra-stage-label">Yatra Lifecycle</span>
                    <select 
                      className={`yatra-stage-dropdown stage-badge-${selectedYatra.status}`}
                      value={selectedYatra.status}
                      onChange={(e) => handleStageChange(e.target.value)}
                    >
                      <option value="planning">🕒 Stage 1: Planning</option>
                      <option value="registration_open">🔗 Stage 2: Registration Open</option>
                      <option value="confirmed">✓ Stage 3: Confirmed</option>
                      <option value="completed">🏁 Stage 4: Completed</option>
                    </select>
                  </div>

                  <div className="yatra-action-buttons">
                    {selectedYatra.status === 'planning' ? (
                      <button 
                        type="button"
                        className="btn btn-outline" 
                        style={{ borderColor: '#fde68a', backgroundColor: '#fef3c7', color: '#b45309', fontSize: '0.82rem', padding: '0.45rem 0.8rem' }} 
                        onClick={() => alert("Registration link is locked during Planning stage. Finalize Yatra essentials (price, hotels, estimated devotees), then switch stage to 'Registration Open' to enable public registrations.")}
                        title="Registration link locked during Planning stage"
                      >
                        <Lock size={14} /> Reg. Link (Locked)
                      </button>
                    ) : selectedYatra.status === 'confirmed' ? (
                      <button 
                        type="button"
                        className="btn btn-outline" 
                        style={{ borderColor: 'var(--success-border)', backgroundColor: 'var(--success-light)', color: 'var(--success)', fontSize: '0.82rem', padding: '0.45rem 0.8rem' }} 
                        onClick={() => alert("This Yatra is Confirmed, so public registration is now closed. Admins can still add devotees individually from the Participants tab.")}
                        title="Public registration closed (Yatra Confirmed)"
                      >
                        <CheckCircle size={14} /> Confirmed (Closed)
                      </button>
                    ) : selectedYatra.status === 'completed' ? (
                      <button 
                        type="button"
                        className="btn btn-outline" 
                        disabled 
                        style={{ opacity: 0.6, fontSize: '0.82rem', padding: '0.45rem 0.8rem' }}
                      >
                        <Compass size={14} /> Completed
                      </button>
                    ) : (selectedYatra.expectedParticipants && participants.reduce((sum, p) => sum + (p.type === 'family' ? (p.membersCount || p.familyMembers?.length || 1) : 1), 0) >= parseInt(selectedYatra.expectedParticipants)) ? (
                      <button 
                        type="button"
                        className="btn btn-outline" 
                        style={{ borderColor: '#fde68a', backgroundColor: '#fffbeb', color: '#b45309', fontSize: '0.82rem', padding: '0.45rem 0.8rem', fontWeight: 600 }} 
                        onClick={() => {
                          const baseUrl = window.location.href.split('#')[0];
                          navigator.clipboard.writeText(`${baseUrl}#/register/${selectedYatra.id}`);
                          alert(`This Yatra has reached full capacity (${selectedYatra.expectedParticipants} target reached). Public registrations are currently closed.\n\nTo accept more devotees, click 'Edit' and increase the target capacity.`);
                        }}
                        title="Yatra has reached target capacity. Increase capacity via 'Edit' to reopen registration link."
                      >
                        <Users size={14} /> Full Capacity ({selectedYatra.expectedParticipants})
                      </button>
                    ) : (
                      <button 
                        type="button"
                        className="btn btn-primary" 
                        style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem' }} 
                        onClick={() => {
                          const baseUrl = window.location.href.split('#')[0];
                          navigator.clipboard.writeText(`${baseUrl}#/register/${selectedYatra.id}`);
                          alert("Copied public registration link to clipboard! Devotees can now register.");
                        }}
                      >
                        <Share2 size={14} /> Share Reg. Link
                      </button>
                    )}

                    <button 
                      type="button"
                      className="btn btn-outline" 
                      style={{ fontSize: '0.82rem', padding: '0.45rem 0.8rem', borderColor: 'var(--primary)', color: 'var(--primary)', fontWeight: 600 }}
                      onClick={() => {
                        setSingleBadgeParticipant(null);
                        setBadgeFilterBus('all');
                        setBadgeFilterHotel('all');
                        setIsPrintBadgesOpen(true);
                      }}
                      title="Print Wearable Devotee Badges / ID Passes"
                    >
                      <Printer size={14} /> {t('printBadges')}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* TABBED MENU */}
            <div className="tab-container">
              <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => handleTabChange('overview')}><Compass size={16} /> Overview</button>
              <button className={`tab-btn ${activeTab === 'bus_allocation' ? 'active' : ''}`} onClick={() => handleTabChange('bus_allocation')} style={{ position: 'relative' }}>
                <Bus size={16} /> Bus Allocation
                {selectedYatra.status === 'confirmed' && <span style={{ width: 7, height: 7, backgroundColor: 'var(--success)', borderRadius: '50%', position: 'absolute', top: 6, right: 6 }} />}
              </button>
              <button className={`tab-btn ${activeTab === 'room_allocation' ? 'active' : ''}`} onClick={() => handleTabChange('room_allocation')} style={{ position: 'relative' }}>
                <Bed size={16} /> Room Allocation
                {selectedYatra.status === 'confirmed' && <span style={{ width: 7, height: 7, backgroundColor: 'var(--success)', borderRadius: '50%', position: 'absolute', top: 6, right: 6 }} />}
              </button>
              <button className={`tab-btn ${activeTab === 'hotels' ? 'active' : ''}`} onClick={() => handleTabChange('hotels')}><Hotel size={16} /> Hotels Research</button>
              <button className={`tab-btn ${activeTab === 'participants' ? 'active' : ''}`} onClick={() => handleTabChange('participants')}><Users size={16} /> Participants</button>
              <button className={`tab-btn ${activeTab === 'payments' ? 'active' : ''}`} onClick={() => handleTabChange('payments')}><CreditCard size={16} /> Payments</button>
              <button className={`tab-btn ${activeTab === 'expenses' ? 'active' : ''}`} onClick={() => handleTabChange('expenses')}><Receipt size={16} /> Expense Splitter</button>
              <button className={`tab-btn ${activeTab === 'photos' ? 'active' : ''}`} onClick={() => handleTabChange('photos')}><ImageIcon size={16} /> Photos</button>
              <button className={`tab-btn ${activeTab === 'notes' ? 'active' : ''}`} onClick={() => handleTabChange('notes')}><ClipboardList size={16} /> Notes & Checklist</button>
              <button className={`tab-btn ${activeTab === 'documents' ? 'active' : ''}`} onClick={() => handleTabChange('documents')}><FileText size={16} /> Documents</button>
              <button className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => handleTabChange('reports')}><BarChart2 size={16} /> Reports</button>
            </div>

            {/* SEARCH BOX FOR CURRENT TAB */}
            {['participants', 'payments', 'hotels', 'expenses', 'bus_allocation', 'room_allocation'].includes(activeTab) && (
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', maxWidth: '440px', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    className="form-control" 
                    style={{ paddingLeft: '2.25rem', paddingRight: searchQuery ? '2.25rem' : '0.75rem' }} 
                    placeholder={
                      activeTab === 'participants' ? 'Search devotees by name, phone, family, notes...' :
                      activeTab === 'payments' ? 'Search payments by devotee, ref, amount...' :
                      activeTab === 'hotels' ? 'Search hotels by name, location, contact...' :
                      activeTab === 'expenses' ? 'Search expenses by remarks, payer, category...' :
                      activeTab === 'bus_allocation' ? 'Search coaches by name, route, driver, passenger...' :
                      activeTab === 'room_allocation' ? 'Search rooms by number, hotel, occupant...' :
                      `Search ${activeTab.replace('_', ' ')}...`
                    }
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button 
                      type="button" 
                      onClick={() => setSearchQuery('')}
                      style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.2rem', lineHeight: '1', padding: '0.1rem 0.25rem' }}
                      title="Clear search"
                    >
                      ×
                    </button>
                  )}
                </div>
                {searchQuery && (
                  <button 
                    type="button" 
                    className="btn btn-outline" 
                    style={{ fontSize: '0.78rem', padding: '0.45rem 0.65rem', whiteSpace: 'nowrap' }}
                    onClick={() => setSearchQuery('')}
                  >
                    Clear
                  </button>
                )}
              </div>
            )}

            {/* ======================================= */}
            {/* TAB: OVERVIEW */}
            {/* ======================================= */}
            {activeTab === 'overview' && (() => {
              const targetSeats = selectedYatra.expectedParticipants || 30;
              const yPrice = parseFloat(selectedYatra.pricePerPerson) || 0;
              const totalRegisteredSeats = participants.reduce((sum, p) => sum + (p.type === 'family' ? (p.membersCount || p.familyMembers?.length || 1) : 1), 0);
              const approvedSeats = participants.filter(p => isDevoteeApproved(p)).reduce((sum, p) => sum + (p.type === 'family' ? (p.membersCount || p.familyMembers?.length || 1) : 1), 0);
              const pendingApprovalSeats = participants.filter(p => !isDevoteeApproved(p)).reduce((sum, p) => sum + (p.type === 'family' ? (p.membersCount || p.familyMembers?.length || 1) : 1), 0);
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
              const bookedHotels = hotels.filter(h => h.finalSelected);

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
                            onClick={() => handleStageChange('registration_open')}
                          >
                            Open Public Registrations →
                          </button>
                        )}
                        {selectedYatra.status === 'registration_open' && (
                          <button 
                            className="btn btn-primary"
                            style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem', backgroundColor: 'var(--success)', borderColor: 'var(--success)' }}
                            onClick={() => handleStageChange('confirmed')}
                          >
                            Confirm Yatra & Close Public Link →
                          </button>
                        )}
                        {selectedYatra.status === 'confirmed' && (
                          <button 
                            className="btn btn-outline"
                            style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem' }}
                            onClick={() => handleStageChange('completed')}
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
                            onClick={() => handleStageChange(step.key)}
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

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.6rem' }}>
                        <div style={{ backgroundColor: 'var(--bg)', padding: '0.75rem 0.5rem', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Target Seats</span>
                          <h4 style={{ fontSize: '1.25rem', margin: '0.2rem 0 0' }}>{targetSeats}</h4>
                        </div>
                        <div style={{ backgroundColor: 'var(--bg)', padding: '0.75rem 0.5rem', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Registered</span>
                          <h4 style={{ fontSize: '1.25rem', margin: '0.2rem 0 0', color: 'var(--primary)' }}>{totalRegisteredSeats}</h4>
                        </div>
                        <div style={{ backgroundColor: 'var(--bg)', padding: '0.75rem 0.5rem', borderRadius: 'var(--radius-sm)', textAlign: 'center', border: '1px solid #a7f3d0' }}>
                          <span style={{ fontSize: '0.72rem', color: '#047857', fontWeight: 600, display: 'block' }}>Approved</span>
                          <h4 style={{ fontSize: '1.25rem', margin: '0.2rem 0 0', color: '#059669' }}>{approvedSeats}</h4>
                        </div>
                        <div style={{ backgroundColor: 'var(--bg)', padding: '0.75rem 0.5rem', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Confirmed</span>
                          <h4 style={{ fontSize: '1.25rem', margin: '0.2rem 0 0', color: 'var(--success)' }}>{confirmedSeats}</h4>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-muted)', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <span>Pending Approval: <strong style={{ color: '#b45309' }}>{pendingApprovalSeats}</strong></span>
                        <span>Interested: <strong>{interestedSeats}</strong></span>
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
                  <div className="grid-overview-bottom">
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                          <Hotel size={16} style={{ color: 'var(--primary)' }} /> Accommodations
                        </h4>
                        {bookedHotels.length > 0 && (
                          <span className="badge badge-confirmed" style={{ fontSize: '0.75rem' }}>
                            {bookedHotels.length} Booked
                          </span>
                        )}
                      </div>
                      {bookedHotels.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                          {bookedHotels.map(h => (
                            <div key={h.id} style={{ backgroundColor: 'var(--success-light)', border: '1px solid hsla(142,70%,45%,0.3)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 'bold' }}>✓ Booked for Yatra</span>
                              <div style={{ fontWeight: 'bold', fontSize: '0.95rem', marginTop: '0.2rem' }}>{h.name}</div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>📍 {h.address}</div>
                              <div style={{ fontSize: '0.78rem', marginTop: '0.35rem' }}>
                                <strong>📞 Contact:</strong> {h.contactPerson} ({h.phone})
                              </div>
                              <div style={{ fontSize: '0.78rem', marginTop: '0.2rem' }}>
                                <strong>Rooms:</strong> {h.roomsAvailable} | <strong>Price:</strong> ₹{h.roomPrice}/night
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ backgroundColor: 'var(--bg)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 0.5rem 0' }}>No hotels marked as booked yet.</p>
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
                    {(() => {
                      const q = (searchQuery || '').trim().toLowerCase();
                      const qDigits = (searchQuery || '').replace(/[^0-9]/g, '');
                      const filteredBuses = buses.filter(bus => {
                        if (!q) return true;
                        if (bus.name && bus.name.toLowerCase().includes(q)) return true;
                        if (bus.busNumber && bus.busNumber.toLowerCase().includes(q)) return true;
                        if (bus.route && bus.route.toLowerCase().includes(q)) return true;
                        if (bus.coordinatorName && bus.coordinatorName.toLowerCase().includes(q)) return true;
                        if (bus.driverName && bus.driverName.toLowerCase().includes(q)) return true;
                        if (bus.boardingPoint && bus.boardingPoint.toLowerCase().includes(q)) return true;
                        if (qDigits && qDigits.length >= 3) {
                          if (bus.coordinatorPhone && bus.coordinatorPhone.replace(/[^0-9]/g, '').includes(qDigits)) return true;
                          if (bus.driverPhone && bus.driverPhone.replace(/[^0-9]/g, '').includes(qDigits)) return true;
                        }
                        const assignedDevotees = participants.filter(p => p.busId === bus.id);
                        return assignedDevotees.some(p => matchesParticipant(p, q, qDigits));
                      });

                      if (filteredBuses.length === 0) {
                        return (
                          <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
                            <Search size={36} style={{ opacity: 0.35, marginBottom: '0.5rem' }} />
                            <div>No bus coaches or assigned passengers found matching "{searchQuery}".</div>
                            {searchQuery && (
                              <button className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', marginTop: '0.75rem' }} onClick={() => setSearchQuery('')}>
                                Clear Search
                              </button>
                            )}
                          </div>
                        );
                      }

                      return filteredBuses.map(bus => {
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
                    });
                  })()}
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
            {activeTab === 'room_allocation' && (() => {
              const bookedHotels = hotels.filter(h => h.finalSelected);
              const distinctHotels = Array.from(new Set([
                ...bookedHotels.map(h => h.name),
                ...rooms.map(r => r.hotelName),
                ...hotels.map(h => h.name)
              ].filter(Boolean)));

              const confirmedDevotees = participants.filter(p => p.status === 'confirmed' || p.status === 'interested');
              const totalPax = confirmedDevotees.reduce((sum, p) => sum + ((p.familyMembers && p.familyMembers.length) || p.membersCount || 1), 0);
              const totalBedCapacity = rooms.reduce((sum, r) => sum + (parseInt(r.bedCount) || parseInt(r.capacity) || 2), 0);

              // Helper: get all assigned occupants for a specific room (individuals + family members)
              const getRoomOccupants = (roomId) => {
                const list = [];
                confirmedDevotees.forEach(p => {
                  if (p.type === 'family' && p.familyMembers && p.familyMembers.length > 0) {
                    p.familyMembers.forEach((m, idx) => {
                      const assignedRoomId = m.roomId !== undefined && m.roomId !== '' ? m.roomId : p.roomId;
                      if (assignedRoomId === roomId) {
                        list.push({
                          participantId: p.id,
                          parentParticipant: p,
                          isFamily: true,
                          familyName: p.familyName || p.name,
                          primaryName: p.name,
                          phone: p.phone,
                          memberIndex: idx,
                          name: m.name,
                          relation: m.relation || 'Member',
                          age: m.age
                        });
                      }
                    });
                  } else {
                    if (p.roomId === roomId) {
                      list.push({
                        participantId: p.id,
                        parentParticipant: p,
                        isFamily: false,
                        familyName: '',
                        primaryName: p.name,
                        phone: p.phone,
                        memberIndex: null,
                        name: p.name,
                        relation: 'Self',
                        age: ''
                      });
                    }
                  }
                });
                return list;
              };

              // Calculate unallocated individuals and family members
              const unallocatedMembers = [];
              const unallocatedIndividuals = [];

              confirmedDevotees.forEach(p => {
                if (p.type === 'family' && p.familyMembers && p.familyMembers.length > 0) {
                  p.familyMembers.forEach((m, idx) => {
                    const assignedRoomId = m.roomId !== undefined && m.roomId !== '' ? m.roomId : p.roomId;
                    if (!assignedRoomId) {
                      unallocatedMembers.push({
                        participantId: p.id,
                        memberIndex: idx,
                        name: m.name,
                        relation: m.relation || 'Member',
                        age: m.age,
                        familyName: p.familyName || p.name,
                        phone: m.phone || p.phone,
                        parent: p
                      });
                    }
                  });
                } else {
                  if (!p.roomId) {
                    unallocatedIndividuals.push(p);
                  }
                }
              });

              const totalUnallocatedPax = unallocatedMembers.length + unallocatedIndividuals.length;
              const totalAllocatedPax = totalPax - totalUnallocatedPax;
              const vacantRoomsCount = rooms.filter(r => getRoomOccupants(r.id).length === 0).length;

              const displayedRooms = selectedHotelFilter === 'all' 
                ? rooms 
                : rooms.filter(r => r.hotelName === selectedHotelFilter);

              return (
                <div>
                  {/* Header & Actions */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <h3 style={{ margin: 0 }}>🏨 Hotel & Guesthouse Room Allocation</h3>
                        <span className={`badge ${roomAllocationApproved ? 'badge-confirmed' : 'badge-interested'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          {roomAllocationApproved ? <Check size={13} /> : <AlertTriangle size={13} />}
                          {roomAllocationApproved ? 'Room Layout Approved' : 'Draft Room Layout'}
                        </span>
                      </div>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                        Stage 3 Confirmed Logistics: Precise bed-count room management across multiple hotels. Smart auto-allocation accommodates families in dedicated suites (e.g. 5-bed suite) or multi-room splits (e.g. 3-bed + twin bed at the same hotel), with full admin manual control over every devotee and family member.
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button 
                        className="btn btn-primary" 
                        onClick={() => {
                          setEditingRoomId(null);
                          const defaultHotel = (selectedHotelFilter !== 'all' ? selectedHotelFilter : (bookedHotels[0]?.name || hotels[0]?.name)) || '';
                          setNewRoom({ 
                            roomNumber: '', 
                            roomType: 'Twin Bed (2 Beds)', 
                            bedCount: 2,
                            capacity: 2, 
                            extraMattressAllowed: 0,
                            floor: 'Ground Floor', 
                            hotelName: defaultHotel, 
                            hotelId: hotels.find(h => h.name === defaultHotel)?.id || '',
                            extraMattressCost: 500, 
                            notes: '',
                            isCustomHotel: false,
                            customHotelName: '',
                            customHotelAddress: '',
                            customHotelContact: '',
                            customHotelPhone: ''
                          });
                          setIsAddRoomOpen(true);
                        }}
                      >
                        <Plus size={16} /> Add Room Inventory
                      </button>
                      <button 
                        className="btn btn-outline" 
                        style={{ borderColor: 'var(--primary)', color: 'var(--primary)', fontWeight: 600 }}
                        onClick={autoAllocateRooms}
                        title="Intelligently matches families to rooms by bed count (or same-hotel multi-room splits like 3-bed + 2-bed twin room) and pairs individuals"
                      >
                        <Shuffle size={16} /> Auto-Allocate by Beds
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

                  {/* Multi-Hotel Quick Filter Switcher */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Filter Accommodations:</span>
                    <button
                      className={`btn ${selectedHotelFilter === 'all' ? 'btn-primary' : 'btn-outline'}`}
                      style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', borderRadius: '20px', whiteSpace: 'nowrap' }}
                      onClick={() => setSelectedHotelFilter('all')}
                    >
                      All Accommodations ({rooms.length} Rooms • {totalBedCapacity} Beds)
                    </button>
                    {distinctHotels.map(hName => {
                      const hRooms = rooms.filter(r => r.hotelName === hName);
                      const hBeds = hRooms.reduce((sum, r) => sum + (parseInt(r.bedCount) || parseInt(r.capacity) || 2), 0);
                      const isBooked = hotels.some(h => h.name === hName && h.finalSelected);
                      return (
                        <button
                          key={hName}
                          className={`btn ${selectedHotelFilter === hName ? 'btn-primary' : 'btn-outline'}`}
                          style={{ 
                            fontSize: '0.8rem', 
                            padding: '0.35rem 0.75rem', 
                            borderRadius: '20px', 
                            whiteSpace: 'nowrap',
                            borderWidth: isBooked ? '1.5px' : '1px'
                          }}
                          onClick={() => setSelectedHotelFilter(hName)}
                        >
                          🏨 {hName} ({hRooms.length} Rooms • {hBeds} Beds){isBooked ? ' ✓' : ''}
                        </button>
                      );
                    })}
                  </div>

                  {/* Overall KPIs */}
                  <div className="grid-cols-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div className="card" style={{ padding: '1rem', borderLeft: '4px solid var(--primary)' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Booked Hotels / Guesthouses</span>
                      <h3 style={{ margin: '0.25rem 0', color: 'var(--primary)' }}>{distinctHotels.length} Accommodations</h3>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{rooms.length} rooms ({totalBedCapacity} total beds)</span>
                    </div>
                    <div className="card" style={{ padding: '1rem', borderLeft: '4px solid var(--warning)' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Devotees Requiring Beds</span>
                      <h3 style={{ margin: '0.25rem 0', color: 'var(--warning)' }}>{totalPax} Devotees</h3>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Across {confirmedDevotees.length} booking groups</span>
                    </div>
                    <div className="card" style={{ padding: '1rem', borderLeft: '4px solid var(--success)' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Bed Allocation Status</span>
                      <h3 style={{ margin: '0.25rem 0', color: 'var(--success)' }}>{totalAllocatedPax} / {totalBedCapacity} Beds</h3>
                      <span style={{ fontSize: '0.75rem', color: totalBedCapacity - totalAllocatedPax >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                        {totalBedCapacity - totalAllocatedPax >= 0 ? `${totalBedCapacity - totalAllocatedPax} standard beds available` : `${totalAllocatedPax - totalBedCapacity} extra mattresses needed`}
                      </span>
                    </div>
                    <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #8b5cf6' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Vacant Rooms</span>
                      <h3 style={{ margin: '0.25rem 0', color: '#8b5cf6' }}>{vacantRoomsCount} Rooms</h3>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Available for new check-ins</span>
                    </div>
                  </div>

                  {/* Rooms Grouped by Hotel */}
                  {rooms.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
                      <Bed size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                      <h4>No Hotel Rooms Added Yet</h4>
                      <p style={{ maxWidth: '480px', margin: '0.5rem auto 1.5rem' }}>
                        Add room inventory for each of your booked hotels or guesthouses (e.g. MVT Guesthouse, Krishna Balaram Residency). Define bed counts accurately (e.g. 5 Beds, 3 Beds, Twin Beds).
                      </p>
                      <button className="btn btn-primary" onClick={() => {
                        setEditingRoomId(null);
                        const defaultHotel = bookedHotels[0]?.name || hotels[0]?.name || 'Primary Hotel';
                        setNewRoom({ 
                          roomNumber: '101', 
                          roomType: 'Twin Bed (2 Beds)', 
                          bedCount: 2,
                          capacity: 2, 
                          extraMattressAllowed: 0,
                          floor: '1st Floor', 
                          hotelName: defaultHotel, 
                          hotelId: hotels.find(h => h.name === defaultHotel)?.id || '',
                          extraMattressCost: 500, 
                          notes: '',
                          isCustomHotel: false,
                          customHotelName: '',
                          customHotelAddress: '',
                          customHotelContact: '',
                          customHotelPhone: ''
                        });
                        setIsAddRoomOpen(true);
                      }}>
                        <Plus size={16} /> Add First Room
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                      {(selectedHotelFilter === 'all' ? distinctHotels : [selectedHotelFilter]).map(hotelName => {
                        const hotelRooms = rooms.filter(r => r.hotelName === hotelName);
                        if (hotelRooms.length === 0 && selectedHotelFilter === 'all') return null;
                        
                        const hotelObj = hotels.find(h => h.name === hotelName) || {};
                        const hotelBedCapacity = hotelRooms.reduce((sum, r) => sum + (parseInt(r.bedCount) || parseInt(r.capacity) || 2), 0);
                        const hotelOccupiedBeds = hotelRooms.reduce((sum, r) => sum + getRoomOccupants(r.id).length, 0);
                        const occupancyPercent = hotelBedCapacity > 0 ? Math.min(100, Math.round((hotelOccupiedBeds / hotelBedCapacity) * 100)) : 0;

                        return (
                          <div key={hotelName} className="card" style={{ padding: '1.25rem', border: '1px solid var(--border)' }}>
                            {/* Hotel Header Banner */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)', marginBottom: '1.25rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                                <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Hotel size={22} />
                                </div>
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <h4 style={{ margin: 0 }}>{hotelName}</h4>
                                    {hotelObj.finalSelected && (
                                      <span className="badge badge-confirmed" style={{ fontSize: '0.7rem' }}>✓ Booked for Yatra</span>
                                    )}
                                    <span className="badge" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}>
                                      {hotelRooms.length} Room{hotelRooms.length > 1 ? 's' : ''} ({hotelBedCapacity} Total Beds)
                                    </span>
                                  </div>
                                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                                    {hotelObj.address && <span>📍 {hotelObj.address}</span>}
                                    {hotelObj.phone && <span>📞 Reception: {hotelObj.phone}</span>}
                                    {hotelObj.contactPerson && <span>👤 Contact: {hotelObj.contactPerson}</span>}
                                    {hotelObj.gmapsLink && (
                                      <a href={hotelObj.gmapsLink} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', color: 'var(--primary)', textDecoration: 'none' }}>
                                        <MapPin size={11} /> Google Maps
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Hotel Occupancy Bar & Quick Add */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ textAlign: 'right', minWidth: '150px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Hotel Bed Occupancy</span>
                                    <strong>{hotelOccupiedBeds} / {hotelBedCapacity} Beds ({occupancyPercent}%)</strong>
                                  </div>
                                  <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg)', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{ 
                                      width: `${occupancyPercent}%`, 
                                      height: '100%', 
                                      backgroundColor: occupancyPercent > 90 ? 'var(--warning)' : 'var(--success)',
                                      transition: 'width 0.3s' 
                                    }} />
                                  </div>
                                </div>

                                <button 
                                  className="btn btn-outline" 
                                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                                  onClick={() => {
                                    setEditingRoomId(null);
                                    setNewRoom({ 
                                      roomNumber: '', 
                                      roomType: 'Twin Bed (2 Beds)', 
                                      bedCount: 2, 
                                      capacity: 2, 
                                      extraMattressAllowed: 0,
                                      floor: 'Ground Floor', 
                                      hotelName: hotelName, 
                                      hotelId: hotelObj.id || '',
                                      extraMattressCost: 500, 
                                      notes: '',
                                      isCustomHotel: false,
                                      customHotelName: '',
                                      customHotelAddress: '',
                                      customHotelContact: '',
                                      customHotelPhone: ''
                                    });
                                    setIsAddRoomOpen(true);
                                  }}
                                >
                                  <Plus size={13} /> Add Room Here
                                </button>
                              </div>
                            </div>

                            {/* Hotel Rooms Grid */}
                            {hotelRooms.length === 0 ? (
                              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: '0.5rem 0' }}>
                                No rooms registered under {hotelName} yet. Click '+ Add Room Here' to add inventory.
                              </p>
                            ) : (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: '1.25rem' }}>
                                {(() => {
                                  const q = (searchQuery || '').trim().toLowerCase();
                                  const qDigits = (searchQuery || '').replace(/[^0-9]/g, '');
                                  const filteredHotelRooms = hotelRooms.filter(room => {
                                    if (!q) return true;
                                    if (room.roomNumber && room.roomNumber.toLowerCase().includes(q)) return true;
                                    if (room.roomType && room.roomType.toLowerCase().includes(q)) return true;
                                    if (room.floor && room.floor.toLowerCase().includes(q)) return true;
                                    if (room.notes && room.notes.toLowerCase().includes(q)) return true;
                                    const occupants = getRoomOccupants(room.id);
                                    return occupants.some(occ => {
                                      if (occ.name && occ.name.toLowerCase().includes(q)) return true;
                                      if (occ.primaryName && occ.primaryName.toLowerCase().includes(q)) return true;
                                      if (occ.familyName && occ.familyName.toLowerCase().includes(q)) return true;
                                      if (occ.phone && (occ.phone.toLowerCase().includes(q) || (qDigits && qDigits.length >= 3 && occ.phone.replace(/[^0-9]/g, '').includes(qDigits)))) return true;
                                      return false;
                                    });
                                  });

                                  if (filteredHotelRooms.length === 0 && q) {
                                    return (
                                      <p style={{ gridColumn: '1 / -1', fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '1rem', textAlign: 'center' }}>
                                        No rooms in {hotelName} matching "{searchQuery}".
                                      </p>
                                    );
                                  }

                                  return filteredHotelRooms.map(room => {
                                  const occupants = getRoomOccupants(room.id);
                                  const occupantCount = occupants.length;
                                  const bedCount = parseInt(room.bedCount) || parseInt(room.capacity) || 2;
                                  const extraAllowed = parseInt(room.extraMattressAllowed) || 0;
                                  const isFull = occupantCount === bedCount;
                                  const isOver = occupantCount > bedCount;

                                  return (
                                    <div key={room.id} style={{ border: isFull ? '1.5px solid var(--border)' : isOver ? '1.5px solid var(--warning)' : '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '1rem', backgroundColor: 'var(--card-bg)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                      <div>
                                        {/* Room Header with Bed Count Badge */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                          <div>
                                            <h4 style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                                              <Bed size={16} color="var(--primary)" /> Room {room.roomNumber}
                                            </h4>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.15rem' }}>
                                              {room.floor || 'Floor'} • <strong>{room.roomType || `${bedCount}-Bedded Room`}</strong>
                                            </span>
                                          </div>
                                          <span className={`badge ${occupantCount === 0 ? 'badge-interested' : isFull ? 'badge-confirmed' : isOver ? 'badge-warning' : 'badge-warning'}`} style={{ whiteSpace: 'nowrap' }}>
                                            {occupantCount === 0 
                                              ? `0 / ${bedCount} Beds (Vacant)` 
                                              : isFull 
                                              ? `${bedCount} / ${bedCount} Beds (Full)` 
                                              : isOver 
                                              ? `${occupantCount} / ${bedCount} Beds (+${occupantCount - bedCount} Mattress)` 
                                              : `${occupantCount} / ${bedCount} Beds (${bedCount - occupantCount} Open)`}
                                          </span>
                                        </div>

                                        {/* Occupants List with Granular Controls */}
                                        <div style={{ backgroundColor: 'var(--bg)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', minHeight: '90px', marginBottom: '0.75rem' }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                                            <span style={{ fontSize: '0.73rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                              Assigned Bed Occupants ({occupantCount} / {bedCount}):
                                            </span>
                                          </div>
                                          {occupants.length === 0 ? (
                                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: '0.5rem 0' }}>
                                              No devotees assigned yet. Vacant and ready.
                                            </p>
                                          ) : (
                                            occupants.map((occ, oIdx) => {
                                              return (
                                                <div key={`${occ.participantId}_${occ.memberIndex !== null ? occ.memberIndex : 'main'}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0', borderBottom: oIdx < occupants.length - 1 ? '1px dashed var(--border)' : 'none', fontSize: '0.8rem' }}>
                                                  <div style={{ flex: 1, paddingRight: '0.5rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                                      <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>🛏️ Bed {oIdx + 1}:</span>
                                                      <strong>{occ.name}</strong>
                                                      {occ.age && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({occ.age}y)</span>}
                                                    </div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                                                      {occ.isFamily ? `${occ.familyName} • ${occ.relation}` : 'Individual Devotee'}
                                                    </div>
                                                  </div>

                                                  {/* Granular Bed Reassignment & Actions */}
                                                  <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                                                    {/* Move Bed Dropdown */}
                                                    <select 
                                                      className="form-control" 
                                                      style={{ fontSize: '0.7rem', padding: '0.2rem 0.35rem', width: 'auto', maxWidth: '125px' }}
                                                      value={room.id}
                                                      onChange={(e) => {
                                                        const targetRoomId = e.target.value;
                                                        if (occ.memberIndex !== null) {
                                                          handleReassignMemberRoom(occ.participantId, occ.memberIndex, targetRoomId);
                                                        } else {
                                                          handleReassignRoom(occ.participantId, targetRoomId);
                                                        }
                                                      }}
                                                      title="Move this devotee to another room / bed"
                                                    >
                                                      <option value={room.id} disabled>Move Bed...</option>
                                                      <option value="">⚠️ Unassign</option>
                                                      {distinctHotels.map(hName => {
                                                        const hRms = rooms.filter(r => r.hotelName === hName);
                                                        return (
                                                          <optgroup key={hName} label={`🏨 ${hName}`}>
                                                            {hRms.map(r => (
                                                              <option key={r.id} value={r.id}>
                                                                Rm {r.roomNumber} ({parseInt(r.bedCount) || parseInt(r.capacity) || 2} Beds)
                                                              </option>
                                                            ))}
                                                          </optgroup>
                                                        );
                                                      })}
                                                    </select>

                                                    <button 
                                                      className="btn btn-outline" 
                                                      style={{ padding: '0.15rem 0.35rem', fontSize: '0.7rem', borderColor: '#25D366', color: '#25D366' }}
                                                      onClick={() => sendRoomWhatsApp(occ.parentParticipant, room, hotelObj)}
                                                      title="Send WhatsApp Room Pass"
                                                    >
                                                      <MessageSquare size={11} /> Pass
                                                    </button>
                                                    <button 
                                                      className="btn btn-outline" 
                                                      style={{ padding: '0.15rem 0.35rem', fontSize: '0.7rem', color: 'var(--danger)', borderColor: 'var(--border)' }}
                                                      onClick={() => {
                                                        if (occ.memberIndex !== null) {
                                                          handleReassignMemberRoom(occ.participantId, occ.memberIndex, '');
                                                        } else {
                                                          handleReassignRoom(occ.participantId, '');
                                                        }
                                                      }}
                                                      title="Remove/Unassign from this room"
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

                                      {/* Footer with Bed Count Specs, Extra Mattress Info & Edit / Delete */}
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid var(--border)', fontSize: '0.75rem' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>
                                          🛏️ <strong>{bedCount} Beds</strong> {extraAllowed > 0 ? `• Extra mattress: ₹${room.extraMattressCost || 500}` : ''}
                                        </span>
                                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                                          <button 
                                            className="btn btn-outline" 
                                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                            onClick={() => {
                                              setEditingRoomId(room.id);
                                              setNewRoom({ 
                                                ...room,
                                                bedCount: parseInt(room.bedCount) || parseInt(room.capacity) || 2,
                                                capacity: parseInt(room.bedCount) || parseInt(room.capacity) || 2,
                                                extraMattressAllowed: parseInt(room.extraMattressAllowed) || 0,
                                                isCustomHotel: false,
                                                customHotelName: '',
                                                customHotelAddress: '',
                                                customHotelContact: '',
                                                customHotelPhone: ''
                                              });
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
                                });
                              })()}
                            </div>
                          )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Unallocated Devotees Section (Granular Family Members + Individuals) */}
                  {totalUnallocatedPax === 0 ? (
                    <div className="card" style={{ marginTop: '2rem', border: '1.5px solid var(--success)', backgroundColor: 'var(--success-light)', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.25rem' }}>
                      <CheckCircle size={24} color="var(--success)" />
                      <div>
                        <h4 style={{ margin: 0, color: 'var(--success)' }}>🎉 All Devotees Fully Allocated!</h4>
                        <p style={{ margin: '0.15rem 0 0', fontSize: '0.85rem', color: 'var(--text)' }}>
                          Every confirmed devotee and family member has been successfully allocated a room bed across your booked hotels.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="card" style={{ marginTop: '2rem', border: '1.5px dashed var(--warning)', backgroundColor: 'var(--warning-light)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <AlertTriangle size={18} color="var(--warning)" />
                        <h4 style={{ margin: 0, color: 'var(--warning)' }}>Unallocated Devotees ({totalUnallocatedPax} Devotee Beds Pending)</h4>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text)', marginBottom: '1rem' }}>
                        The following devotees or family members need room bed assignments. You can assign them manually to any room with open beds or click <strong>'Auto-Allocate by Beds'</strong> above.
                      </p>
                      <div className="table-container" style={{ margin: 0 }}>
                        <table style={{ fontSize: '0.85rem', backgroundColor: 'var(--card-bg)' }}>
                          <thead>
                            <tr>
                              <th>Devotee / Member Name</th>
                              <th>Group / Family</th>
                              <th>Relation & Age</th>
                              <th>Assign to Room & Hotel</th>
                            </tr>
                          </thead>
                          <tbody>
                            {/* Unallocated Family Members */}
                            {unallocatedMembers.map(m => (
                              <tr key={`unalloc_mem_${m.participantId}_${m.memberIndex}`}>
                                <td>
                                  <strong>{m.name}</strong> ({m.phone})
                                </td>
                                <td>
                                  <span className="badge" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}>
                                    {m.familyName}
                                  </span>
                                </td>
                                <td>{m.relation} {m.age ? `(Age ${m.age})` : ''}</td>
                                <td>
                                  <select 
                                    className="form-control" 
                                    style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                                    value=""
                                    onChange={(e) => handleReassignMemberRoom(m.participantId, m.memberIndex, e.target.value)}
                                  >
                                    <option value="" disabled>-- Assign Bed to Room --</option>
                                    {distinctHotels.map(hName => {
                                      const hRooms = rooms.filter(r => r.hotelName === hName);
                                      if (hRooms.length === 0) return null;
                                      return (
                                        <optgroup key={hName} label={`🏨 ${hName}`}>
                                          {hRooms.map(r => {
                                            const occs = getRoomOccupants(r.id);
                                            const bCount = parseInt(r.bedCount) || parseInt(r.capacity) || 2;
                                            const openBeds = Math.max(0, bCount - occs.length);
                                            return (
                                              <option key={r.id} value={r.id}>
                                                Room {r.roomNumber} ({r.roomType || `${bCount} Beds`} • {openBeds} Open Beds)
                                              </option>
                                            );
                                          })}
                                        </optgroup>
                                      );
                                    })}
                                  </select>
                                </td>
                              </tr>
                            ))}

                            {/* Unallocated Individuals */}
                            {unallocatedIndividuals.map(devotee => (
                              <tr key={`unalloc_ind_${devotee.id}`}>
                                <td><strong>{devotee.name}</strong> ({devotee.phone})</td>
                                <td><span className="badge">Individual Devotee</span></td>
                                <td>Self</td>
                                <td>
                                  <select 
                                    className="form-control" 
                                    style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                                    value=""
                                    onChange={(e) => handleReassignRoom(devotee.id, e.target.value)}
                                  >
                                    <option value="" disabled>-- Assign Bed to Room --</option>
                                    {distinctHotels.map(hName => {
                                      const hRooms = rooms.filter(r => r.hotelName === hName);
                                      if (hRooms.length === 0) return null;
                                      return (
                                        <optgroup key={hName} label={`🏨 ${hName}`}>
                                          {hRooms.map(r => {
                                            const occs = getRoomOccupants(r.id);
                                            const bCount = parseInt(r.bedCount) || parseInt(r.capacity) || 2;
                                            const openBeds = Math.max(0, bCount - occs.length);
                                            return (
                                              <option key={r.id} value={r.id}>
                                                Room {r.roomNumber} ({r.roomType || `${bCount} Beds`} • {openBeds} Open Beds)
                                              </option>
                                            );
                                          })}
                                        </optgroup>
                                      );
                                    })}
                                  </select>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

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
                      {(() => {
                        const filteredHotels = filterList(hotels, ['name', 'address', 'contactPerson', 'notes', 'phone', 'distanceFromTemple', 'roomPrice']);
                        if (filteredHotels.length === 0) {
                          return (
                            <tr>
                              <td colSpan={7} style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
                                <Search size={36} style={{ opacity: 0.35, marginBottom: '0.5rem' }} />
                                <div>No hotels found matching "{searchQuery}".</div>
                                {searchQuery && (
                                  <button className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', marginTop: '0.5rem' }} onClick={() => setSearchQuery('')}>
                                    Clear Search
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        }
                        return filteredHotels.map(hotel => (
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
                                  <input 
                                    type="checkbox" 
                                    checked={hotel.finalSelected} 
                                    onChange={(e) => toggleHotelField(hotel.id, 'finalSelected', e.target.checked)} 
                                  />
                                  <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: hotel.finalSelected ? 'var(--success)' : 'var(--text-muted)' }}>
                                    {hotel.finalSelected ? '✓ Booked for Yatra' : 'Booked for Yatra'}
                                  </span>
                                </label>
                              </div>
                            </td>
                            <td>
                              <button className="btn btn-danger btn-icon" onClick={() => db.deleteHotel(hotel.id).then(() => setRefreshTrigger(prev => prev + 1))}>
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ======================================= */}
            {/* TAB: PARTICIPANTS */}
            {/* ======================================= */}
            {activeTab === 'participants' && (() => {
              const q = (searchQuery || '').trim().toLowerCase();
              const qDigits = (searchQuery || '').replace(/[^0-9]/g, '');

              // 1. All participants matching search query
              const baseFiltered = q 
                ? participants.filter(p => matchesParticipant(p, q, qDigits))
                : participants;

              // 2. Participants matching both search filter AND active status filter pill
              const filteredList = baseFiltered.filter(p => {
                const split = expCalc.splits.find(s => s.id === p.id);
                const devStatus = (split?.dynamicPaymentStatus === 'completed' && p.status === 'interested') ? 'confirmed' : (split?.dynamicDevoteeStatus || p.status);
                const payStatus = split?.dynamicPaymentStatus || p.paymentStatus;
                
                if (participantFilter === 'pending_approval') return !isDevoteeApproved(p);
                if (participantFilter === 'approved') return isDevoteeApproved(p);
                if (participantFilter === 'registered_unpaid') return payStatus !== 'completed' && p.status !== 'cancelled';
                if (participantFilter === 'cash_promised') return Boolean(p.cashPromiseDate) && payStatus !== 'completed';
                if (participantFilter === 'confirmed') return devStatus === 'confirmed';
                if (participantFilter === 'interested') return devStatus === 'interested';
                if (participantFilter === 'partially_paid') return payStatus === 'partially_paid';
                if (participantFilter === 'completed') return payStatus === 'completed';
                return true; // 'all'
              });

              // 3. Chronological sorting: latest registration on top by default
              const displayedParticipants = [...filteredList].sort((a, b) => {
                if (participantSortOrder === 'oldest') {
                  const diff = getParticipantTimestamp(a) - getParticipantTimestamp(b);
                  return diff !== 0 ? diff : (a.name || '').localeCompare(b.name || '');
                }
                if (participantSortOrder === 'name') {
                  return (a.name || '').localeCompare(b.name || '');
                }
                if (participantSortOrder === 'seats') {
                  const seatsA = a.type === 'family' ? (a.membersCount || a.familyMembers?.length || 1) : 1;
                  const seatsB = b.type === 'family' ? (b.membersCount || b.familyMembers?.length || 1) : 1;
                  return seatsB - seatsA;
                }
                // Default: 'newest' (latest registration on top, earliest at the bottom)
                const tsA = getParticipantTimestamp(a);
                const tsB = getParticipantTimestamp(b);
                if (tsB !== tsA) return tsB - tsA;
                return 0;
              });

              const pendingCount = participants.filter(p => !isDevoteeApproved(p)).length;
              const unpaidCount = participants.filter(p => {
                const split = expCalc.splits.find(s => s.id === p.id);
                const payStatus = split?.dynamicPaymentStatus || p.paymentStatus;
                return payStatus !== 'completed' && p.status !== 'cancelled';
              }).length;
              const cashPromisedCount = participants.filter(p => {
                const split = expCalc.splits.find(s => s.id === p.id);
                const payStatus = split?.dynamicPaymentStatus || p.paymentStatus;
                return Boolean(p.cashPromiseDate) && payStatus !== 'completed';
              }).length;

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

                  {/* PENDING ELIGIBILITY APPROVAL ALERT BANNER */}
                  {pendingCount > 0 && (
                    <div style={{ backgroundColor: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 'var(--radius-sm)', padding: '0.85rem 1.15rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <Clock size={20} style={{ color: '#d97706', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.88rem', color: '#92400e' }}>
                          <strong>{pendingCount} Devotee(s) Pending Eligibility Review:</strong> Devotees submitted interest with no upfront payment. Once approved, UPI payment options unlock in their portal.
                        </span>
                      </div>
                      <button 
                        className="btn btn-primary" 
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', backgroundColor: '#16a34a', borderColor: '#15803d', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                        onClick={handleApproveAllPending}
                      >
                        <CheckCircle size={14} /> {t('approveAllPending') || 'Approve All Pending'}
                      </button>
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
                        className={`btn ${participantFilter === 'pending_approval' ? 'btn-primary' : 'btn-outline'}`}
                        style={{ padding: '0.3rem 0.65rem', fontSize: '0.8rem', borderColor: participantFilter === 'pending_approval' ? '' : '#f59e0b', color: participantFilter === 'pending_approval' ? '' : '#b45309' }}
                        onClick={() => setParticipantFilter('pending_approval')}
                      >
                        ⏳ {t('filterPendingApproval') || 'Pending Approval'} ({pendingCount})
                      </button>
                      <button 
                        className={`btn ${participantFilter === 'approved' ? 'btn-primary' : 'btn-outline'}`}
                        style={{ padding: '0.3rem 0.65rem', fontSize: '0.8rem', borderColor: participantFilter === 'approved' ? '' : '#10b981', color: participantFilter === 'approved' ? '' : '#059669' }}
                        onClick={() => setParticipantFilter('approved')}
                      >
                        ✓ {t('filterApproved') || 'Approved'} ({participants.filter(p => isDevoteeApproved(p)).length})
                      </button>
                      <button 
                        className={`btn ${participantFilter === 'registered_unpaid' ? 'btn-primary' : 'btn-outline'}`}
                        style={{ padding: '0.3rem 0.65rem', fontSize: '0.8rem', borderColor: participantFilter === 'registered_unpaid' ? '' : '#ef4444', color: participantFilter === 'registered_unpaid' ? '' : '#dc2626' }}
                        onClick={() => setParticipantFilter('registered_unpaid')}
                        title="Devotees registered but not yet fully paid"
                      >
                        ⚠️ {t('filterRegisteredUnpaid') || 'Registered (Unpaid)'} ({unpaidCount})
                      </button>
                      <button 
                        className={`btn ${participantFilter === 'cash_promised' ? 'btn-primary' : 'btn-outline'}`}
                        style={{ padding: '0.3rem 0.65rem', fontSize: '0.8rem', borderColor: participantFilter === 'cash_promised' ? '' : '#d97706', color: participantFilter === 'cash_promised' ? '' : '#b45309' }}
                        onClick={() => setParticipantFilter('cash_promised')}
                        title="Devotees who promised to pay via cash on a future date"
                      >
                        💵 Cash Promised ({cashPromisedCount})
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

                    {/* View Switcher, Sort Selector & Register Button */}
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      {/* Sort Selector */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', backgroundColor: 'var(--bg)', borderRadius: 'var(--radius-sm)', padding: '0.2rem 0.5rem', border: '1px solid var(--border)' }} title="Sort Order">
                        <ArrowUpDown size={14} style={{ color: 'var(--text-muted)' }} />
                        <select 
                          value={participantSortOrder} 
                          onChange={(e) => setParticipantSortOrder(e.target.value)}
                          style={{ border: 'none', background: 'transparent', fontSize: '0.78rem', color: 'var(--text)', outline: 'none', cursor: 'pointer', fontWeight: 500 }}
                        >
                          <option value="newest">🕒 Newest First (Latest on Top)</option>
                          <option value="oldest">⏳ Oldest First (1st at Top)</option>
                          <option value="name">🔤 Name (A → Z)</option>
                          <option value="seats">👥 Group Size / Seats</option>
                        </select>
                      </div>

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

                      <button 
                        className="btn btn-primary" 
                        onClick={() => {
                          setEditingParticipantId(null);
                          setNewParticipant({ name: '', phone: '', email: '', location: '', type: 'individual', familyName: '', membersCount: 1, familyMembers: [], memberDetails: '', travelMode: 'organised', travelType: '', boardingStation: '', droppingStation: '', remarks: '', status: 'interested', paymentStatus: 'pending', approvalStatus: 'pending', isApproved: false });
                          setIsAddParticipantOpen(true);
                        }}
                      >
                        <Plus size={16} /> Register Devotee
                      </button>
                    </div>
                  </div>

                  {/* SEARCH QUERY STATUS & FILTER CONFLICT ALERT */}
                  {q && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--primary-light)', padding: '0.6rem 0.9rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                          <Search size={16} style={{ color: 'var(--primary)' }} />
                          <span>Searching: <strong>"{searchQuery}"</strong> — Showing <strong>{displayedParticipants.length}</strong> matching devotee{displayedParticipants.length === 1 ? '' : 's'} {participantFilter !== 'all' ? `in '${participantFilter}'` : ''} (out of {participants.length} total)</span>
                        </div>
                        <button 
                          className="btn btn-outline" 
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.55rem', borderColor: 'var(--primary)', color: 'var(--primary)', backgroundColor: 'var(--card-bg)' }}
                          onClick={() => setSearchQuery('')}
                        >
                          Clear Search
                        </button>
                      </div>

                      {/* Conflict banner if filter hides matching devotees */}
                      {participantFilter !== 'all' && displayedParticipants.length === 0 && baseFiltered.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#eff6ff', border: '1.5px solid #60a5fa', borderRadius: 'var(--radius-sm)', padding: '0.7rem 1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                          <span style={{ fontSize: '0.85rem', color: '#1e40af' }}>
                            ⚠️ <strong>{baseFiltered.length} devotee(s)</strong> match "{searchQuery}", but are hidden by the active status filter (<strong>{participantFilter}</strong>).
                          </span>
                          <button 
                            className="btn btn-primary" 
                            style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem', backgroundColor: '#2563eb' }}
                            onClick={() => setParticipantFilter('all')}
                          >
                            Switch to 'All' to View ({baseFiltered.length})
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* VIEW 1: CLEAN & SPACIOUS TABLE WITH EXPANDABLE ROW */}
                  {participantViewMode === 'table' && (
                    <div className="table-container">
                      <table style={{ borderCollapse: 'separate', borderSpacing: '0 0.4rem' }}>
                        <thead>
                          <tr>
                            <th style={{ width: '18%' }}>Devotee</th>
                            <th style={{ width: '14%' }}>Group / Seats</th>
                            <th style={{ width: '12%' }}>Travel</th>
                            <th style={{ width: '10%' }}>Status</th>
                            <th style={{ width: '14%' }}>Eligibility</th>
                            <th style={{ width: '11%' }}>Yatra Fee</th>
                            <th style={{ width: '11%' }}>Payment</th>
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
                                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                                      {part.location && (
                                        <span style={{ fontSize: '0.7rem', backgroundColor: 'var(--bg)', border: '1px solid var(--border)', padding: '0.1rem 0.35rem', borderRadius: '3px' }}>
                                          📍 {part.location}
                                        </span>
                                      )}
                                      {formatRegistrationDate(part) && (
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', backgroundColor: 'var(--bg)', border: '1px solid var(--border)', padding: '0.1rem 0.35rem', borderRadius: '3px', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }} title="Registration Date & Time">
                                          🕒 {formatRegistrationDate(part)}
                                        </span>
                                      )}
                                    </div>
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

                                  {/* Eligibility & Admin Approval */}
                                  <td>
                                    {isDevoteeApproved(part) ? (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', alignItems: 'flex-start' }}>
                                        <span className="badge" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)', border: '1px solid var(--success-border)', fontWeight: '600' }}>
                                          ✓ {t('approvedEligible') || 'Approved'}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => handleRevokeEligibility(part)}
                                          style={{ background: 'none', border: 'none', color: '#b91c1c', fontSize: '0.7rem', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
                                          title="Revoke approval to lock payment"
                                        >
                                          {t('revokeApproval') || 'Revoke'}
                                        </button>
                                      </div>
                                    ) : (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', alignItems: 'flex-start' }}>
                                        <span className="badge" style={{ backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', fontWeight: '600' }}>
                                          ⏳ {t('pendingApproval') || 'Pending'}
                                        </span>
                                        <button
                                          type="button"
                                          className="btn btn-primary"
                                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem', backgroundColor: '#16a34a', borderColor: '#15803d', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                                          onClick={() => handleApproveEligibility(part)}
                                          title="Approve for Yatra (enables payment options)"
                                        >
                                          <Check size={12} /> {t('approveDevotee') || 'Approve'}
                                        </button>
                                      </div>
                                    )}
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
                                    {part.cashPromiseDate && dynamicPaymentStatus !== 'completed' && (() => {
                                      const isOverdue = new Date(part.cashPromiseDate) < new Date(new Date().setHours(0, 0, 0, 0));
                                      return (
                                        <div style={{ marginTop: '0.35rem' }}>
                                          <div style={{ fontSize: '0.72rem', backgroundColor: isOverdue ? '#fee2e2' : '#fef3c7', color: isOverdue ? '#991b1b' : '#92400e', border: `1px solid ${isOverdue ? '#fca5a5' : '#fde68a'}`, padding: '0.15rem 0.35rem', borderRadius: '4px', fontWeight: 600 }}>
                                            💵 {part.cashPromiseDate} {isOverdue && `(⚠️ ${t('cashOverdue') || 'Overdue'})`}
                                          </div>
                                          {part.cashPromiseAmount && (
                                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                                              Committed: ₹{Number(part.cashPromiseAmount).toLocaleString()}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })()}
                                    {dynamicPaymentStatus !== 'completed' && isDevoteeApproved(part) && (
                                      <div style={{ marginTop: '0.35rem' }}>
                                        <button
                                          type="button"
                                          className="btn btn-outline"
                                          style={{ padding: '0.2rem 0.45rem', fontSize: '0.72rem', borderColor: '#16a34a', color: '#16a34a', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                                          onClick={() => handleAdminReceiveCash(part, splitInfo ? splitInfo.balance : (part.cashPromiseAmount || computedShare))}
                                          title="Record cash received from devotee"
                                        >
                                          💵 {t('receiveCashBtn') || 'Receive Cash'}
                                        </button>
                                      </div>
                                    )}
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
                                        type="button"
                                        className="btn btn-outline" 
                                        style={{ padding: '0.3rem 0.45rem', fontSize: '0.75rem', borderColor: 'var(--primary)', color: 'var(--primary)' }} 
                                        onClick={() => handleOpenEditParticipant(part)}
                                        title={t('editDevotee') || "Edit Devotee"}
                                      >
                                        <Edit2 size={13} />
                                      </button>

                                      <button 
                                        type="button"
                                        className="btn btn-outline" 
                                        style={{ padding: '0.3rem 0.45rem', fontSize: '0.75rem', borderColor: 'var(--primary)', color: 'var(--primary)' }} 
                                        onClick={() => {
                                          setSingleBadgeParticipant(part);
                                          setIsPrintBadgesOpen(true);
                                        }}
                                        title={t('printBadge')}
                                      >
                                        <Printer size={13} />
                                      </button>

                                      <button 
                                        type="button"
                                        className="btn btn-danger btn-icon" 
                                        style={{ padding: '0.3rem' }}
                                        onClick={() => handleDeleteParticipant(part.id, part.name)}
                                        title={t('deleteDevotee') || "Delete Participant"}
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>

                                {/* EXPANDED DETAILS DRAWER SUB-ROW */}
                                {isExpanded && (
                                  <tr style={{ backgroundColor: 'var(--bg)' }}>
                                    <td colSpan={8} style={{ padding: '1rem 1.25rem', borderTop: 'none', borderBottom: '2px solid var(--border)' }}>
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
                                            {formatRegistrationDate(part, true) && (
                                              <div><strong>🕒 Registered:</strong> {formatRegistrationDate(part, true)}</div>
                                            )}
                                            {part.remarks && (
                                              <div style={{ marginTop: '0.35rem', padding: '0.4rem', backgroundColor: 'var(--bg)', borderRadius: '4px', fontSize: '0.78rem' }}>
                                                <strong>Remarks:</strong> {part.remarks}
                                              </div>
                                            )}
                                            {part.cashPromiseDate && (
                                              <div style={{ marginTop: '0.5rem', padding: '0.45rem 0.6rem', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '4px', fontSize: '0.78rem', color: '#92400e' }}>
                                                <strong>💵 Cash Promised:</strong> {part.cashPromiseDate}
                                                {part.cashPromiseAmount && <span> (₹{Number(part.cashPromiseAmount).toLocaleString()})</span>}
                                                {part.cashPromiseNotes && <div style={{ fontSize: '0.72rem', marginTop: '0.15rem' }}>Note: {part.cashPromiseNotes}</div>}
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
                                            {dynamicPaymentStatus !== 'completed' && isDevoteeApproved(part) && (
                                              <button 
                                                className="btn btn-outline" 
                                                style={{ fontSize: '0.75rem', padding: '0.3rem 0.5rem', color: '#16a34a', borderColor: '#16a34a', fontWeight: 600 }} 
                                                onClick={() => handleAdminReceiveCash(part, splitInfo ? splitInfo.balance : (part.cashPromiseAmount || computedShare))}
                                              >
                                                💵 {t('receiveCashBtn') || 'Receive Cash'}
                                              </button>
                                            )}
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
                                            <button 
                                              type="button"
                                              className="btn btn-outline" 
                                              style={{ fontSize: '0.75rem', padding: '0.3rem 0.5rem', color: 'var(--primary)', borderColor: 'var(--primary)' }} 
                                              onClick={() => handleOpenEditParticipant(part)}
                                            >
                                              <Edit2 size={12} style={{ display: 'inline', marginRight: '3px' }} /> {t('editDevotee') || 'Edit Devotee'}
                                            </button>
                                            <button 
                                              type="button"
                                              className="btn btn-outline" 
                                              style={{ fontSize: '0.75rem', padding: '0.3rem 0.5rem', color: '#dc2626', borderColor: '#fca5a5' }} 
                                              onClick={() => handleDeleteParticipant(part.id, part.name)}
                                            >
                                              <Trash2 size={12} style={{ display: 'inline', marginRight: '3px' }} /> {t('deleteDevotee') || 'Delete Devotee'}
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
                          {displayedParticipants.length === 0 && (
                            <tr>
                              <td colSpan={8} style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-muted)' }}>
                                <Search size={40} style={{ opacity: 0.35, marginBottom: '0.75rem' }} />
                                <h4 style={{ margin: '0 0 0.4rem 0', color: 'var(--text)' }}>
                                  {q ? `No Devotees Found Matching "${searchQuery}"` : 'No Devotees In This Category'}
                                </h4>
                                <p style={{ fontSize: '0.82rem', margin: '0 0 1rem 0' }}>
                                  {q ? 'Search checks name, family members, phone, location, travel, remarks, and payment refs.' : 'No registrations match the selected filter.'}
                                </p>
                                {(q || participantFilter !== 'all') && (
                                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                    {q && (
                                      <button className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.35rem 0.8rem' }} onClick={() => setSearchQuery('')}>
                                        Clear Search
                                      </button>
                                    )}
                                    {participantFilter !== 'all' && (
                                      <button className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.8rem' }} onClick={() => setParticipantFilter('all')}>
                                        Show All Devotees
                                      </button>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
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
                                  {formatRegistrationDate(part) && (
                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                      <Clock size={11} /> Registered: {formatRegistrationDate(part)}
                                    </div>
                                  )}
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

                              {/* Eligibility Status Block */}
                              <div style={{ backgroundColor: isDevoteeApproved(part) ? 'var(--success-light)' : '#fffbeb', border: `1px solid ${isDevoteeApproved(part) ? 'var(--success-border)' : '#fde68a'}`, padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <span style={{ fontSize: '0.78rem', fontWeight: 'bold', color: isDevoteeApproved(part) ? 'var(--success)' : '#b45309' }}>
                                    {isDevoteeApproved(part) ? `✓ ${t('approvedEligible') || 'Approved for Yatra'}` : `⏳ ${t('pendingApproval') || 'Eligibility Pending'}`}
                                  </span>
                                  <div style={{ fontSize: '0.7rem', color: isDevoteeApproved(part) ? '#047857' : '#92400e', marginTop: '0.1rem' }}>
                                    {isDevoteeApproved(part) ? 'Payment options enabled' : 'Payment options locked'}
                                  </div>
                                </div>
                                {isDevoteeApproved(part) ? (
                                  <button
                                    type="button"
                                    onClick={() => handleRevokeEligibility(part)}
                                    style={{ background: 'none', border: 'none', color: '#b91c1c', fontSize: '0.72rem', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
                                  >
                                    {t('revokeApproval') || 'Revoke'}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="btn btn-primary"
                                    style={{ padding: '0.2rem 0.55rem', fontSize: '0.72rem', backgroundColor: '#16a34a', borderColor: '#15803d', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                                    onClick={() => handleApproveEligibility(part)}
                                  >
                                    <Check size={12} /> {t('approveDevotee') || 'Approve'}
                                  </button>
                                )}
                              </div>

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

                              {/* Cash Promised Banner in Card */}
                              {part.cashPromiseDate && dynamicPaymentStatus !== 'completed' && (() => {
                                const isOverdue = new Date(part.cashPromiseDate) < new Date(new Date().setHours(0, 0, 0, 0));
                                return (
                                  <div style={{ backgroundColor: isOverdue ? '#fee2e2' : '#fffbeb', border: `1px solid ${isOverdue ? '#fca5a5' : '#fde68a'}`, padding: '0.45rem 0.65rem', borderRadius: 'var(--radius-sm)', marginBottom: '0.75rem', fontSize: '0.78rem', color: isOverdue ? '#991b1b' : '#92400e' }}>
                                    <div style={{ fontWeight: 'bold' }}>
                                      💵 Cash Promised: {part.cashPromiseDate} {isOverdue && `(⚠️ ${t('cashOverdue') || 'Overdue'})`}
                                    </div>
                                    {part.cashPromiseAmount && (
                                      <div style={{ fontSize: '0.72rem', marginTop: '0.1rem', color: isOverdue ? '#b91c1c' : '#b45309' }}>
                                        Committed: ₹{Number(part.cashPromiseAmount).toLocaleString()}
                                      </div>
                                    )}
                                    {part.cashPromiseNotes && (
                                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                                        Note: {part.cashPromiseNotes}
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>

                            {/* Card Footer Actions */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--border)', marginTop: '0.5rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                              <span className="badge" style={{ backgroundColor: dynamicPaymentStatus === 'completed' ? 'var(--success-light)' : (dynamicPaymentStatus === 'partially_paid' ? 'var(--primary-light)' : 'var(--warning-light)'), color: dynamicPaymentStatus === 'completed' ? 'var(--success)' : (dynamicPaymentStatus === 'partially_paid' ? 'var(--primary)' : 'var(--warning)') }}>
                                {dynamicPaymentStatus.replace('_', ' ')}
                              </span>

                              <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                                {dynamicPaymentStatus !== 'completed' && isDevoteeApproved(part) && (
                                  <button 
                                    type="button" 
                                    className="btn btn-outline" 
                                    style={{ padding: '0.25rem 0.45rem', fontSize: '0.75rem', borderColor: '#16a34a', color: '#16a34a', fontWeight: 600 }} 
                                    onClick={() => handleAdminReceiveCash(part, balance > 0 ? balance : (part.cashPromiseAmount || computedShare))}
                                    title="Record cash received"
                                  >
                                    💵 {t('receiveCashBtn') || 'Receive Cash'}
                                  </button>
                                )}
                                <button 
                                  type="button"
                                  className="btn btn-outline" 
                                  style={{ padding: '0.25rem 0.45rem', fontSize: '0.75rem', borderColor: 'var(--primary)', color: 'var(--primary)' }} 
                                  onClick={() => handleOpenEditParticipant(part)}
                                  title={t('editDevotee') || 'Edit Devotee'}
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => sendWhatsApp(part, dynamicPaymentStatus === 'completed' ? 'payment_verified' : 'payment_reminder')}>
                                  WhatsApp
                                </button>
                                <button 
                                  type="button"
                                  className="btn btn-outline" 
                                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderColor: 'var(--primary)', color: 'var(--primary)' }} 
                                  onClick={() => {
                                    setSingleBadgeParticipant(part);
                                    setIsPrintBadgesOpen(true);
                                  }}
                                  title={t('printBadge')}
                                >
                                  <Printer size={13} />
                                </button>
                                <button 
                                  type="button"
                                  className="btn btn-danger btn-icon" 
                                  style={{ padding: '0.25rem' }}
                                  onClick={() => handleDeleteParticipant(part.id, part.name)}
                                  title={t('deleteDevotee') || 'Delete Devotee'}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {displayedParticipants.length === 0 && (
                        <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-muted)' }}>
                          <Search size={40} style={{ opacity: 0.35, marginBottom: '0.75rem' }} />
                          <h4 style={{ margin: '0 0 0.4rem 0', color: 'var(--text)' }}>
                            {q ? `No Devotees Found Matching "${searchQuery}"` : 'No Devotees In This Category'}
                          </h4>
                          <p style={{ fontSize: '0.82rem', margin: '0 0 1rem 0' }}>
                            {q ? 'Search checks name, family members, phone, location, travel, remarks, and payment refs.' : 'No registrations match the selected filter.'}
                          </p>
                          {(q || participantFilter !== 'all') && (
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                              {q && (
                                <button className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.35rem 0.8rem' }} onClick={() => setSearchQuery('')}>
                                  Clear Search
                                </button>
                              )}
                              {participantFilter !== 'all' && (
                                <button className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.8rem' }} onClick={() => setParticipantFilter('all')}>
                                  Show All Devotees
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
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
                      {(() => {
                        const filteredPayments = filterList(payments, ['transactionRef', 'amountPaid', 'paymentDate', 'paymentMethod', 'status'], (pay, q, qDigits) => {
                          const partObj = participants.find(p => p.id === pay.participantId);
                          if (partObj) {
                            if (partObj.name && partObj.name.toLowerCase().includes(q)) return true;
                            if (partObj.phone && (partObj.phone.toLowerCase().includes(q) || (qDigits && qDigits.length >= 3 && partObj.phone.replace(/[^0-9]/g, '').includes(qDigits)))) return true;
                            if (partObj.familyName && partObj.familyName.toLowerCase().includes(q)) return true;
                            if (partObj.location && partObj.location.toLowerCase().includes(q)) return true;
                            if (partObj.city && partObj.city.toLowerCase().includes(q)) return true;
                          }
                          return false;
                        });

                        return (
                          <>
                            {filteredPayments.length === 0 && (
                              <tr>
                                <td colSpan={8} style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
                                  <Search size={36} style={{ opacity: 0.35, marginBottom: '0.5rem' }} />
                                  <div>No payments found matching "{searchQuery}".</div>
                                  {searchQuery && (
                                    <button className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', marginTop: '0.5rem' }} onClick={() => setSearchQuery('')}>
                                      Clear Search
                                    </button>
                                  )}
                                </td>
                              </tr>
                            )}
                            {filteredPayments.map(pay => {
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
                    </>
                  );
                })()}
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
                          {(() => {
                            const filteredExpenses = filterList(expenses, ['remarks', 'paidBy', 'category', 'amount', 'date', 'appliesTo']);
                            if (filteredExpenses.length === 0) {
                              return (
                                <tr>
                                  <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
                                    <Search size={32} style={{ opacity: 0.35, marginBottom: '0.5rem' }} />
                                    <div>No expenses found matching "{searchQuery}".</div>
                                    {searchQuery && (
                                      <button className="btn btn-outline" style={{ fontSize: '0.78rem', padding: '0.3rem 0.65rem', marginTop: '0.5rem' }} onClick={() => setSearchQuery('')}>
                                        Clear Search
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            }
                            return filteredExpenses.map(exp => (
                              <tr key={exp.id}>
                                <td>{exp.date}</td>
                                <td><span className="badge" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>{exp.category}</span></td>
                                <td><strong>₹{exp.amount}</strong></td>
                                <td>{exp.paidBy}</td>
                                <td><span style={{ textTransform: 'capitalize' }}>{exp.appliesTo}</span></td>
                                <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{exp.remarks}</td>
                                <td>
                                  <button className="btn btn-danger btn-icon" onClick={() => handleDeleteExpense(exp)} title="Delete Expense">
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              </tr>
                            ));
                          })()}
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

                {photos.length === 0 ? (
                  <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-muted)' }}>
                    <ImageIcon size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                    <h4>No Photos in Yatra Gallery</h4>
                    <p style={{ maxWidth: '420px', margin: '0.5rem auto 1.5rem', fontSize: '0.85rem' }}>
                      Upload spiritual moments and tour memories above. Once uploaded, they will be visible to devotees in their portal.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                    {photos.map(photo => (
                      <div key={photo.id} className="card" style={{ padding: '0.5rem', display: 'flex', flexDirection: 'column' }}>
                        <img src={photo.imageUrl} alt="Uploaded" style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />
                        <div style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
                          <strong>{photo.uploader}</strong>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{photo.date}</p>
                          {photo.caption && <p style={{ fontStyle: 'italic', marginTop: '0.25rem' }}>"{photo.caption}"</p>}
                        </div>
                        <button 
                          type="button"
                          className="btn btn-danger btn-icon" 
                          style={{ alignSelf: 'flex-end', marginTop: 'auto', padding: '0.35rem 0.6rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }} 
                          onClick={() => handleDeletePhoto(photo.id)}
                          title="Delete Photo Permanently"
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
                            <td style={{ padding: '0.5rem 0' }}>Approved & Eligible Devotees:</td>
                            <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--success)' }}>{participants.filter(p => isDevoteeApproved(p)).length}</td>
                          </tr>
                          <tr>
                            <td style={{ padding: '0.5rem 0' }}>Pending Eligibility Review:</td>
                            <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#b45309' }}>{participants.filter(p => !isDevoteeApproved(p)).length}</td>
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
        {currentRoute.path === 'register' && selectedYatra && (() => {
          const yatraTargetCapacity = parseInt(selectedYatra.expectedParticipants) || 0;
          const currentRegisteredSeats = participants
            .filter(p => (p.yatraId === selectedYatra.id) && !p.isDeleted)
            .reduce((sum, p) => sum + (p.type === 'family' ? (p.membersCount || p.familyMembers?.length || 1) : 1), 0);
          const isCapacityReached = yatraTargetCapacity > 0 && currentRegisteredSeats >= yatraTargetCapacity;

          return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
            <div className="card" style={{ width: '100%', maxWidth: '600px', padding: '2.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
                <button 
                  type="button"
                  className="btn btn-outline" 
                  style={{ padding: '0.35rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', fontWeight: 600, borderColor: 'var(--primary)', color: 'var(--primary)' }}
                  onClick={() => toggleLanguage()}
                  title="Switch Language / भाषा बदलें"
                >
                  <Languages size={14} />
                  <span>{lang === 'en' ? '🇮🇳 हिंदी में भरें' : '🇬🇧 Switch to English'}</span>
                </button>
              </div>

              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <Compass size={40} style={{ color: 'var(--primary)', marginBottom: '0.5rem' }} />
                <h2>{t('publicRegTitle')}</h2>
                <h4>{selectedYatra.name}</h4>
                <p style={{ color: 'var(--text-muted)' }}>📍 {selectedYatra.destination}</p>
                <p style={{ color: 'var(--text-muted)' }}>📅 {selectedYatra.startDate} to {selectedYatra.endDate}</p>
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
              ) : isCapacityReached ? (
                /* FULL CAPACITY REACHED */
                <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                  <div style={{ backgroundColor: '#fef3c7', color: '#b45309', width: '3.75rem', height: '3.75rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', border: '2px solid #fde68a' }}>
                    <Users size={30} />
                  </div>
                  <h3 style={{ color: '#92400e' }}>{t('registrationCapacityFullTitle') || 'Registration Full'}</h3>
                  <div style={{ backgroundColor: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 'var(--radius-sm)', padding: '1.25rem', margin: '1.25rem auto', maxWidth: '480px', color: '#92400e', fontSize: '0.95rem', lineHeight: '1.6', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontWeight: 600 }}>
                      {t('registrationCapacityFullMessage') || 'The registration for this yatra has reached full capacity. Please reach out to admins for further assistance. Hare Krishna!'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    <span>Registered: <strong>{currentRegisteredSeats}</strong></span>
                    <span>•</span>
                    <span>Target Capacity: <strong>{yatraTargetCapacity}</strong></span>
                  </div>
                  <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button className="btn btn-outline" onClick={() => navigateTo('home')}>
                      Back to Yatras
                    </button>
                    <button className="btn btn-primary" onClick={() => navigateTo('login')}>
                      Registered Devotee Login
                    </button>
                  </div>
                </div>
              ) : publicRegStatus === 'success' ? (
                <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                  <div style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)', width: '3.75rem', height: '3.75rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                    <Check size={32} />
                  </div>
                  <h3 style={{ fontSize: '1.35rem', color: 'var(--text)' }}>
                    {t('interestSubmittedTitle') || 'Registration & Interest Submitted! 🙏'}
                  </h3>
                  <div style={{ maxWidth: '460px', margin: '1.25rem auto 1.5rem', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: 'var(--radius-sm)', padding: '1.1rem', textAlign: 'left', fontSize: '0.88rem', color: '#92400e', lineHeight: '1.5' }}>
                    <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.4rem', color: '#b45309', fontSize: '0.92rem' }}>
                      <Clock size={17} /> {t('pendingEligibilityBadge') || 'Pending Eligibility Review (No Payment Taken Upfront)'}
                    </div>
                    <p style={{ margin: 0 }}>
                      {t('noUpfrontPaymentDesc') || 'Your registration details have been securely recorded. To ensure smooth logistics, organizers review registrations before opening payment collection. Once approved, payment options will be activated in your Devotee Portal.'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button className="btn btn-primary" onClick={() => { setPublicRegStatus(null); navigateTo('login'); }}>
                      {t('goToDevoteePortal') || 'Go to Devotee Portal'}
                    </button>
                  </div>
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
                      {(() => {
                        const duplicateDevotee = getExistingYatraParticipantByPhone(newParticipant.phone);
                        if (!duplicateDevotee) return null;
                        return (
                          <div style={{
                            marginTop: '0.65rem',
                            backgroundColor: '#fffbeb',
                            border: '1.5px solid #f59e0b',
                            borderRadius: 'var(--radius-sm)',
                            padding: '0.75rem 0.9rem',
                            color: '#92400e',
                            fontSize: '0.85rem'
                          }}>
                            <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#b45309', marginBottom: '0.3rem' }}>
                              <AlertTriangle size={16} />
                              <span>{t('mobileAlreadyRegisteredTitle') || 'Mobile Number Already Registered!'}</span>
                            </div>
                            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.82rem', lineHeight: '1.45' }}>
                              {t('mobileAlreadyRegisteredDesc') || 'A registration for this Yatra is already linked to this mobile number.'}
                              {' '}Registered as <strong>{duplicateDevotee.name}</strong> {duplicateDevotee.type === 'family' ? `(${duplicateDevotee.familyName || 'Family Group'})` : ''}.
                            </p>
                            <button
                              type="button"
                              className="btn btn-primary"
                              style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                              onClick={() => navigateTo('login')}
                            >
                              <Compass size={14} /> {t('goToDevoteePortal') || 'Go to Devotee Portal Login'}
                            </button>
                          </div>
                        );
                      })()}
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

                  <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: 'var(--radius-sm)', padding: '0.85rem 1rem', marginTop: '1rem', marginBottom: '0.5rem', fontSize: '0.84rem', color: '#92400e', lineHeight: '1.45', display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                    <Clock size={18} style={{ flexShrink: 0, marginTop: '2px', color: '#d97706' }} />
                    <div>
                      <strong>{t('noUpfrontPaymentNotice') || 'No Upfront Payment Required'}</strong>
                      <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#b45309' }}>
                        {t('noUpfrontPaymentDesc') || 'Submit your registration and express your interest. Organizers will review devotee eligibility, after which payment options will be activated in your Devotee Portal.'}
                      </p>
                    </div>
                  </div>

                  {(() => {
                    const isDup = !!getExistingYatraParticipantByPhone(newParticipant.phone);
                    return (
                      <button 
                        type="submit" 
                        className="btn btn-primary" 
                        disabled={isDup}
                        style={{ width: '100%', marginTop: '0.75rem', padding: '0.75rem', fontSize: '0.95rem', fontWeight: '600', opacity: isDup ? 0.6 : 1, cursor: isDup ? 'not-allowed' : 'pointer' }}
                      >
                        {isDup ? (t('duplicatePhoneBlocked') || 'Already Registered (Duplicates Not Allowed)') : (t('submitInterestBtn') || 'Submit Yatra Registration (No Upfront Payment)')}
                      </button>
                    );
                  })()}
                </form>
              )}
            </div>
          </div>
        );
      })()}

        {/* ======================================= */}
        {/* VIEW 5: PUBLIC UPI QR PAYMENT */}
        {/* ======================================= */}
        {currentRoute.path === 'payment' && selectedYatra && (() => {
          const pObj = paymentParticipant || participants.find(p => p.id === currentRoute.id);
          const isApproved = isDevoteeApproved(pObj);

          if (pObj && !isApproved) {
            return (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
                <div className="card" style={{ width: '100%', maxWidth: '520px', padding: '2.5rem', textAlign: 'center' }}>
                  <div style={{ backgroundColor: '#fffbeb', color: '#d97706', width: '3.75rem', height: '3.75rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                    <Clock size={32} />
                  </div>
                  <h2 style={{ fontSize: '1.4rem' }}>{t('approvalPendingDirectPay') || 'Registration Pending Eligibility Approval'}</h2>
                  <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: 'var(--radius-sm)', padding: '1.1rem', margin: '1.25rem 0 1.75rem', textAlign: 'left', fontSize: '0.88rem', color: '#92400e', lineHeight: '1.5' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '0.35rem', color: '#b45309' }}>
                      Devotee: {pObj.name} {pObj.type === 'family' ? `(${pObj.familyName || 'Family Group'})` : ''}
                    </div>
                    <p style={{ margin: 0, fontSize: '0.84rem' }}>
                      {t('approvalPendingDirectPayDesc') || 'Hare Krishna! Payment options for this devotee registration are not yet enabled because registration is currently under review by the Yatra organizing committee. Once approved by the admin, UPI QR code and payment receipt submission will unlock automatically.'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button className="btn btn-primary" onClick={() => navigateTo('login')}>
                      {t('goToDevoteePortal') || 'Devotee Portal Login'}
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          return (
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

                  {/* Cash-only: payment date & promise info */}
                  {publicPayMethod === 'cash' && (
                    <div style={{ textAlign: 'left', marginBottom: '1rem' }}>
                      <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: 'var(--radius-sm)', padding: '0.85rem', marginBottom: '1rem', fontSize: '0.84rem', color: '#92400e', lineHeight: '1.45' }}>
                        <strong>💵 Pay by Cash (Select Future Date):</strong>
                        <p style={{ margin: '0.2rem 0 0', color: '#b45309', fontSize: '0.8rem' }}>
                          You can choose today or any date in the future (e.g. 20th Oct 2026) by when you will hand over cash to the organizers. Your commitment will be registered, and organizers will verify upon receiving the cash.
                        </p>
                      </div>
                      <div className="form-group">
                        <label style={{ fontWeight: '600' }}>Expected / Promised Date of Cash Handover</label>
                        <input type="date" required className="form-control" value={publicPayDate} onChange={(e) => setPublicPayDate(e.target.value)} />
                        <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                          💡 You can choose a future date (e.g. upon reaching destination, during satsang, or by a specific date)
                        </small>
                      </div>
                    </div>
                  )}

                  <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', padding: '0.75rem' }}>
                    {publicPayMethod === 'cash' ? '✓ Confirm Cash Payment Commitment' : 'Submit Payment Receipt'}
                  </button>
                </form>
              )}
            </div>
          </div>
        ); })()}

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
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <button 
                  type="button"
                  className="btn btn-outline" 
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', borderColor: 'var(--primary)', color: 'var(--primary)', fontWeight: 600 }}
                  onClick={() => {
                    setSingleBadgeParticipant(myParticipantData);
                    setIsPrintBadgesOpen(true);
                  }}
                >
                  <Printer size={15} /> {t('printBadge')}
                </button>
                <span className={`badge badge-${myParticipantData.status}`}>{myParticipantData.status}</span>
                {isDevoteeApproved(myParticipantData) ? (
                  <span className="badge" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)', border: '1px solid var(--success-border)', fontWeight: 600 }}>
                    ✓ {t('approvedEligible') || 'Eligible for Yatra'}
                  </span>
                ) : (
                  <span className="badge" style={{ backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', fontWeight: 600 }}>
                    ⏳ {t('pendingApproval') || 'Pending Eligibility Approval'}
                  </span>
                )}
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

                      {/* HOTEL ROOM STAY PASSES */}
                      {(() => {
                        const allocatedRoomPasses = [];
                        if (currentDevotee.type === 'family' && currentDevotee.familyMembers && currentDevotee.familyMembers.length > 0) {
                          const roomMap = {};
                          currentDevotee.familyMembers.forEach(m => {
                            const rId = m.roomId !== undefined && m.roomId !== '' ? m.roomId : currentDevotee.roomId;
                            if (rId) {
                              if (!roomMap[rId]) {
                                const rObj = rooms.find(r => r.id === rId);
                                roomMap[rId] = {
                                  room: rObj,
                                  hotel: hotels.find(h => h.id === rObj?.hotelId || h.name === rObj?.hotelName) || hotels.find(h => h.finalSelected) || hotels[0],
                                  members: []
                                };
                              }
                              roomMap[rId].members.push(m);
                            }
                          });
                          Object.values(roomMap).forEach(v => allocatedRoomPasses.push(v));
                        } else if (currentDevotee.roomId) {
                          const rObj = rooms.find(r => r.id === currentDevotee.roomId);
                          allocatedRoomPasses.push({
                            room: rObj,
                            hotel: hotels.find(h => h.id === rObj?.hotelId || h.name === rObj?.hotelName) || hotels.find(h => h.finalSelected) || hotels[0],
                            members: [{ name: currentDevotee.name, relation: 'Self' }]
                          });
                        }

                        if (allocatedRoomPasses.length === 0) {
                          return (
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
                          );
                        }

                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {allocatedRoomPasses.map((pass, pIdx) => {
                              const rm = pass.room;
                              const ht = pass.hotel;
                              if (!rm) return null;
                              return (
                                <div key={rm.id || pIdx} className="card" style={{ border: '2px solid var(--success)', backgroundColor: 'var(--card-bg)', position: 'relative', overflow: 'hidden' }}>
                                  <div style={{ position: 'absolute', top: 0, right: 0, backgroundColor: 'var(--success)', color: 'white', padding: '0.25rem 0.85rem', borderBottomLeftRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <Bed size={13} /> HOTEL ROOM PASS {allocatedRoomPasses.length > 1 ? `#${pIdx + 1}` : ''}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginTop: '0.5rem' }}>
                                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--success-light)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                      <Bed size={24} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <h3 style={{ margin: 0, color: 'var(--success)' }}>Room {rm.roomNumber}</h3>
                                        <span className="badge" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}>{rm.roomType || 'Standard Room'}</span>
                                        <span className="badge" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}>{rm.floor || 'Ground Floor'}</span>
                                        <span className="badge badge-confirmed">{rm.bedCount || rm.capacity || 2} Beds</span>
                                      </div>
                                      <p style={{ fontSize: '0.85rem', color: 'var(--text)', margin: '0.4rem 0' }}>
                                        <strong>Hotel:</strong> {rm.hotelName || ht?.name || 'Yatra Hotel Accommodation'}
                                      </p>
                                      {ht?.address && (
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.2rem 0' }}>
                                          📍 {ht.address}
                                        </p>
                                      )}
                                      <div style={{ backgroundColor: 'var(--bg)', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-sm)', marginTop: '0.5rem', fontSize: '0.82rem' }}>
                                        <strong style={{ color: 'var(--text)' }}>Staying in this Room:</strong> {pass.members.map(m => m.name + (m.relation && m.relation !== 'Self' ? ` (${m.relation})` : '')).join(', ')}
                                      </div>
                                      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                        {ht?.gmapsLink && (
                                          <a 
                                            href={ht.gmapsLink} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="btn btn-outline" 
                                            style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                                          >
                                            <MapPin size={13} /> View on Google Maps
                                          </a>
                                        )}
                                        {ht?.phone && (
                                          <a 
                                            href={`tel:${ht.phone}`} 
                                            style={{ fontSize: '0.8rem', color: 'var(--text)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                                          >
                                            <Phone size={13} /> Hotel Reception: {ht.phone}
                                          </a>
                                        )}
                                      </div>
                                      {rm.notes && (
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.5rem 0 0', fontStyle: 'italic' }}>
                                          ℹ️ {rm.notes}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })()}

                {/* MY DETAILS & TRAVEL NOTES */}
                <div className="card" style={{ marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3>Yatra Schedule & General Reference</h3>
                    <button className="btn btn-outline" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} onClick={() => {
                      const existingMembers = (myParticipantData.familyMembers && Array.isArray(myParticipantData.familyMembers) && myParticipantData.familyMembers.length > 0)
                        ? myParticipantData.familyMembers.map(m => ({ ...m }))
                        : (myParticipantData.name ? [{ name: myParticipantData.name, relation: 'Self', age: '', phone: myParticipantData.phone || '' }] : []);

                      setEditProfileData({
                        ...myParticipantData,
                        type: myParticipantData.type || (existingMembers.length > 1 ? 'family' : 'individual'),
                        familyName: myParticipantData.familyName || (myParticipantData.name ? `${myParticipantData.name} Family` : ''),
                        familyMembers: existingMembers,
                        location: myParticipantData.location || myParticipantData.city || ''
                      });
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
                              const updated = await db.getPhotos(selectedYatra.id);
                              setMyPhotos(updated);
                              setPhotos(updated);
                            });
                          }
                        }}
                      />
                    </label>
                  </div>

                  {myPhotos.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      <ImageIcon size={36} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
                      <p>No photos have been shared for this Yatra yet.</p>
                      <p style={{ fontSize: '0.85rem' }}>Be the first to upload and share memories with all devotees!</p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
                      {myPhotos.map(photo => {
                        const canDelete = currentUser?.role === 'admin' || (myParticipantData && (photo.uploader === myParticipantData.name || photo.uploader === myParticipantData.phone));
                        return (
                          <div key={photo.id} style={{ position: 'relative', display: 'flex', flexDirection: 'column', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                            <img src={photo.imageUrl} alt="Shared" style={{ width: '100%', height: '130px', objectFit: 'cover' }} />
                            {canDelete && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeletePhoto(photo.id);
                                }}
                                style={{
                                  position: 'absolute',
                                  top: '6px',
                                  right: '6px',
                                  background: 'rgba(239, 68, 68, 0.85)',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '50%',
                                  width: '26px',
                                  height: '26px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                }}
                                title="Delete Photo"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                            <div style={{ padding: '0.5rem', fontSize: '0.75rem' }}>
                              <strong>{photo.uploader}</strong>
                              <p style={{ color: 'var(--text-muted)' }}>{photo.date}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
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
                  ) : !isDevoteeApproved(myParticipantData) ? (
                    <div style={{ padding: '1rem 0' }}>
                      <div style={{ backgroundColor: '#fffbeb', color: '#d97706', width: '3.5rem', height: '3.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                        <Clock size={28} />
                      </div>
                      <h4 style={{ color: '#b45309', margin: '0 0 0.5rem 0' }}>
                        {t('paymentLockedNotice') || 'Eligibility Review in Progress'}
                      </h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '1.25rem' }}>
                        {t('paymentLockedDesc') || 'Hare Krishna! Your interest has been submitted. The Yatra organizing team is reviewing devotee eligibility. Payment options (UPI QR and receipt submission) will be automatically unlocked here as soon as the organizers approve your registration.'}
                      </p>
                      <div style={{ backgroundColor: 'var(--bg)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        🔒 Payment collection options currently locked pending admin approval
                      </div>
                    </div>
                  ) : (() => {
                    const yPrice = selectedYatra.pricePerPerson ? parseFloat(selectedYatra.pricePerPerson) : 0;
                    let billablePax = 1;
                    if (myParticipantData.type === 'family') {
                      if (myParticipantData.familyMembers && myParticipantData.familyMembers.length > 0) {
                        billablePax = myParticipantData.familyMembers.filter(m => !m.age || parseInt(m.age) >= 5).length || 1;
                      } else {
                        billablePax = myParticipantData.membersCount || 1;
                      }
                    }
                    const calculatedFee = (myParticipantData.customPrice && parseFloat(myParticipantData.customPrice) > 0)
                      ? parseFloat(myParticipantData.customPrice)
                      : (billablePax * yPrice);

                    return (
                      <div>
                        <div style={{ backgroundColor: 'var(--success-light)', border: '1px solid var(--success-border)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.75rem', marginBottom: '1rem', fontSize: '0.82rem', color: 'var(--success)', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                          <CheckCircle size={16} />
                          <span>{t('eligibilityApprovedBanner') || 'Registration Approved! Payment options are unlocked.'}</span>
                        </div>

                        {/* Existing Cash Commitment Banner if Devotee already promised cash */}
                        {myParticipantData.cashPromiseDate && (
                          <div style={{ backgroundColor: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 'var(--radius-sm)', padding: '0.9rem', textAlign: 'left', marginBottom: '1.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#b45309', fontWeight: 'bold', fontSize: '0.88rem', marginBottom: '0.35rem' }}>
                              <Clock size={16} />
                              <span>{t('cashPromiseRecordedTitle') || 'Cash Payment Promised'}</span>
                            </div>
                            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.82rem', color: '#92400e', lineHeight: '1.4' }}>
                              {t('cashPromiseRecordedDesc') || 'Your commitment to pay cash has been recorded. Organizers will collect and verify upon receiving the cash.'}
                            </p>
                            <div style={{ backgroundColor: '#fef3c7', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: '#78350f', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              <div>📅 <strong>Promised Payment Date:</strong> {new Date(myParticipantData.cashPromiseDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                              <div>💰 <strong>Committed Amount:</strong> {myParticipantData.cashPromiseAmount ? `₹${parseFloat(myParticipantData.cashPromiseAmount).toLocaleString()}` : (calculatedFee > 0 ? `₹${calculatedFee.toLocaleString()}` : 'To be confirmed')}</div>
                              {myParticipantData.cashPromiseNotes && <div>📝 <strong>Handover Notes:</strong> {myParticipantData.cashPromiseNotes}</div>}
                              <div>⏳ <strong>Status:</strong> Awaiting Cash Collection by Admin</div>
                            </div>
                          </div>
                        )}

                        {/* Payment Method Toggle: UPI vs Cash */}
                        <div style={{ display: 'flex', backgroundColor: 'var(--bg)', borderRadius: 'var(--radius-sm)', padding: '0.25rem', marginBottom: '1.25rem', border: '1px solid var(--border)' }}>
                          <button
                            type="button"
                            className={`btn ${devoteePayTab === 'upi' ? 'btn-primary' : ''}`}
                            style={{ flex: 1, padding: '0.5rem', fontSize: '0.82rem', fontWeight: 600, background: devoteePayTab === 'upi' ? '' : 'none', color: devoteePayTab === 'upi' ? '' : 'var(--text-muted)', border: 'none' }}
                            onClick={() => setDevoteePayTab('upi')}
                          >
                            📱 {t('payViaUpi') || 'Pay via UPI'}
                          </button>
                          <button
                            type="button"
                            className={`btn ${devoteePayTab === 'cash' ? 'btn-primary' : ''}`}
                            style={{ flex: 1, padding: '0.5rem', fontSize: '0.82rem', fontWeight: 600, background: devoteePayTab === 'cash' ? '' : 'none', color: devoteePayTab === 'cash' ? '' : 'var(--text-muted)', border: 'none' }}
                            onClick={() => {
                              setDevoteePayTab('cash');
                              if (!devoteeCashPromiseDate && myParticipantData.cashPromiseDate) {
                                setDevoteeCashPromiseDate(myParticipantData.cashPromiseDate);
                              }
                              if (devoteeCashPromiseAmount === '') {
                                if (myParticipantData.cashPromiseAmount && parseFloat(myParticipantData.cashPromiseAmount) > 0) {
                                  setDevoteeCashPromiseAmount(myParticipantData.cashPromiseAmount.toString());
                                } else if (calculatedFee > 0) {
                                  setDevoteeCashPromiseAmount(calculatedFee.toString());
                                }
                              }
                            }}
                          >
                            💵 {t('payByCash') || 'Pay by Cash'}
                          </button>
                        </div>

                        {devoteePayTab === 'upi' ? (
                          <div>
                            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: '0 0 1rem 0' }}>
                              Scan the UPI QR code below with any UPI App and submit your transaction receipt details.
                            </p>
                            
                            <div style={{ backgroundColor: 'var(--bg)', padding: '1rem', borderRadius: 'var(--radius-sm)', display: 'inline-block', marginBottom: '1rem', border: '1px solid var(--border)' }}>
                              <img 
                                src={selectedYatra.customQrImageUrl || getUPIQRCodeUrl(selectedYatra.upiId, selectedYatra.upiName, calculatedFee, 'Confirm Yatra Seat')} 
                                alt="Pay UPI" 
                                style={{ width: '160px', height: '160px', objectFit: 'contain', backgroundColor: 'white', padding: '0.25rem', borderRadius: 'var(--radius-sm)' }}
                              />
                              <div style={{ fontSize: '0.78rem', color: 'var(--text)', marginTop: '0.4rem' }}>
                                <strong>Exact Fee:</strong> ₹{calculatedFee.toLocaleString()}
                              </div>
                            </div>
                            
                            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => navigateTo('payment', myParticipantData.id)}>
                              Upload Payment Receipt / Enter Reference
                            </button>
                          </div>
                        ) : (
                          <form onSubmit={(e) => handleDevoteeSubmitCashPromise(e, calculatedFee)} style={{ textAlign: 'left' }}>
                            <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: 'var(--radius-sm)', padding: '0.75rem 0.9rem', marginBottom: '1rem', fontSize: '0.82rem', color: '#92400e', lineHeight: '1.45' }}>
                              <strong>💵 {t('cashPromiseTitle') || 'Pay by Cash (Select Future Date)'}</strong>
                              <p style={{ margin: '0.25rem 0 0', color: '#b45309' }}>
                                {t('cashPromiseDesc') || 'Select an expected date by when you will hand over the cash contribution to the organizers. Admins will verify and confirm upon receiving the cash.'}
                              </p>
                            </div>

                            <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                              <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                                📅 {t('promisedPaymentDate') || 'Promised Payment Date'} <span style={{ color: 'var(--danger)' }}>*</span>
                              </label>
                              <input
                                type="date"
                                required
                                className="form-control"
                                value={devoteeCashPromiseDate}
                                onChange={(e) => setDevoteeCashPromiseDate(e.target.value)}
                              />
                              <small style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '0.2rem', display: 'block' }}>
                                💡 E.g. Select today or any future date (e.g. 20th Oct 2026) by when you will pay
                              </small>
                            </div>

                            <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                              <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                                Amount to Pay (₹) <span style={{ color: 'var(--danger)' }}>*</span>
                              </label>
                              <input
                                type="number"
                                required
                                min="1"
                                className="form-control"
                                placeholder={calculatedFee > 0 ? calculatedFee.toString() : "Enter amount (₹)"}
                                value={devoteeCashPromiseAmount}
                                onChange={(e) => setDevoteeCashPromiseAmount(e.target.value)}
                                style={{ fontWeight: 'bold', color: 'var(--primary)' }}
                              />
                            </div>

                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                              <label style={{ fontSize: '0.82rem' }}>
                                Handover Details / Note (Optional)
                              </label>
                              <input
                                type="text"
                                className="form-control"
                                placeholder="e.g. Will give cash to Rohitji at Sunday Feast / at hotel"
                                value={devoteeCashPromiseNotes}
                                onChange={(e) => setDevoteeCashPromiseNotes(e.target.value)}
                              />
                            </div>

                            <button
                              type="submit"
                              className="btn btn-primary"
                              style={{ width: '100%', padding: '0.65rem', fontWeight: 600 }}
                            >
                              ✓ {t('submitCashPromiseBtn') || 'Confirm Cash Payment Date'}
                            </button>
                          </form>
                        )}
                      </div>
                    );
                  })()}
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

      {/* MODAL: UPDATE PROFILE & FAMILY DETAILS (DEVOTEE PORTAL) */}
      {isEditProfileOpen && editProfileData && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Edit2 size={20} style={{ color: 'var(--primary)' }} />
                <h3 style={{ margin: 0 }}>Update Profile & Family Details</h3>
              </div>
              <button className="modal-close" onClick={() => setIsEditProfileOpen(false)}>×</button>
            </div>
            <form onSubmit={handleUpdateProfile}>
              <div className="grid-cols-2">
                <div className="form-group">
                  <label>Full Name (Primary Devotee)</label>
                  <input 
                    type="text" 
                    required 
                    className="form-control" 
                    value={editProfileData.name || ''} 
                    onChange={(e) => setEditProfileData({...editProfileData, name: e.target.value})} 
                  />
                </div>
                <div className="form-group">
                  <label>Registered Mobile Number</label>
                  <input 
                    type="tel" 
                    disabled 
                    className="form-control" 
                    value={editProfileData.phone || ''} 
                    style={{ backgroundColor: 'var(--bg)', color: 'var(--text-muted)', cursor: 'not-allowed' }}
                    title="Mobile number is your login identifier"
                  />
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '0.2rem', display: 'block' }}>
                    🔒 Login identifier linked to your account
                  </small>
                </div>
              </div>

              <div className="grid-cols-2">
                <div className="form-group">
                  <label>Email Address <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 'normal' }}>(Optional)</span></label>
                  <input 
                    type="email" 
                    className="form-control" 
                    placeholder="name@gmail.com" 
                    value={editProfileData.email || ''} 
                    onChange={(e) => setEditProfileData({...editProfileData, email: e.target.value})} 
                  />
                </div>
                <div className="form-group">
                  <label>City / Location</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. Mumbai, Delhi" 
                    value={editProfileData.location || editProfileData.city || ''} 
                    onChange={(e) => setEditProfileData({...editProfileData, location: e.target.value, city: e.target.value})} 
                  />
                </div>
              </div>

              {/* REGISTRATION TYPE SELECTOR */}
              <div className="form-group">
                <label>Registration Type</label>
                <select 
                  className="form-control"
                  value={editProfileData.type || 'individual'} 
                  onChange={(e) => {
                    const newType = e.target.value;
                    let members = editProfileData.familyMembers || [];
                    if (newType === 'family' && members.length === 0) {
                      members = [{ name: editProfileData.name || '', relation: 'Self', age: '', phone: editProfileData.phone || '' }];
                    }
                    setEditProfileData({
                      ...editProfileData, 
                      type: newType, 
                      familyMembers: members,
                      familyName: editProfileData.familyName || (newType === 'family' ? `${editProfileData.name || 'My'} Family` : '')
                    });
                  }}
                >
                  <option value="individual">Individual Traveller (1 Person)</option>
                  <option value="family">Family Group (Multiple Members / Seats)</option>
                </select>
              </div>

              {/* FAMILY GROUP MEMBERS ROSTER (SAME FORMAT AS REGISTRATION FORM) */}
              {editProfileData.type === 'family' && (
                <div style={{ backgroundColor: 'var(--bg)', padding: '1.25rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', border: '1px solid var(--border)' }}>
                  <div className="form-group">
                    <label>Family Name / Title</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. Sharma Family" 
                      value={editProfileData.familyName || ''} 
                      onChange={(e) => setEditProfileData({...editProfileData, familyName: e.target.value})} 
                    />
                  </div>

                  {/* Warning Banner */}
                  <div style={{ backgroundColor: 'var(--warning-light)', color: 'var(--warning)', border: '1px solid hsla(38,92%,50%,0.3)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start', fontSize: '0.82rem' }}>
                    <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ lineHeight: '1.4' }}>
                      <strong>Important:</strong> Please ensure yourself is included with relation <strong>"Self"</strong> along with all accompanying members so your group roster and seat count stay accurate.
                    </div>
                  </div>

                  {/* Quick Add Myself Button if not yet added */}
                  {!(editProfileData.familyMembers || []).some(m => m.relation === 'Self') && (
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ marginBottom: '1rem', fontSize: '0.82rem', padding: '0.4rem 0.75rem', borderColor: 'var(--primary)', color: 'var(--primary)', width: '100%', backgroundColor: 'var(--primary-light)', fontWeight: '600' }}
                      onClick={() => {
                        const selfMember = { name: editProfileData.name || '', relation: 'Self', age: '', phone: editProfileData.phone || '' };
                        const current = editProfileData.familyMembers || [];
                        const updated = [selfMember, ...current];
                        setEditProfileData({ ...editProfileData, familyMembers: updated, membersCount: updated.length });
                      }}
                    >
                      👤 Click to Add Yourself ({editProfileData.name || 'Primary Devotee'}) as 1st Member
                    </button>
                  )}

                  {/* Individual Family Member Rows */}
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <label style={{ fontWeight: '600', fontSize: '0.9rem', margin: 0 }}>Family Members Roster</label>
                      <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 'bold' }}>
                        {editProfileData.familyMembers?.length || 0} Member{(editProfileData.familyMembers?.length || 0) === 1 ? '' : 's'}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Children under 5 years are exempt from yatra fees (Free seat).</p>

                    {(editProfileData.familyMembers || []).map((member, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem', padding: '0.5rem', backgroundColor: 'var(--card-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                        <div style={{ flex: 2 }}>
                          <input 
                            type="text" 
                            required 
                            className="form-control" 
                            placeholder="Full Name" 
                            value={member.name || ''} 
                            onChange={(e) => {
                              const updated = [...editProfileData.familyMembers];
                              updated[idx] = { ...updated[idx], name: e.target.value };
                              setEditProfileData({...editProfileData, familyMembers: updated});
                            }} 
                            style={{ fontSize: '0.85rem', padding: '0.4rem' }} 
                          />
                        </div>
                        <div style={{ flex: 1.2 }}>
                          <select 
                            className="form-control" 
                            value={member.relation || ''} 
                            onChange={(e) => {
                              const updated = [...editProfileData.familyMembers];
                              updated[idx] = { ...updated[idx], relation: e.target.value };
                              setEditProfileData({...editProfileData, familyMembers: updated});
                            }} 
                            style={{ fontSize: '0.85rem', padding: '0.4rem' }}
                          >
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
                          <input 
                            type="number" 
                            className="form-control" 
                            placeholder="Age" 
                            min={0} 
                            max={120} 
                            value={member.age || ''} 
                            onChange={(e) => {
                              const updated = [...editProfileData.familyMembers];
                              updated[idx] = { ...updated[idx], age: e.target.value };
                              setEditProfileData({...editProfileData, familyMembers: updated});
                            }} 
                            style={{ fontSize: '0.85rem', padding: '0.4rem' }} 
                          />
                        </div>
                        <div style={{ flex: 1.5 }}>
                          <input 
                            type="tel" 
                            className="form-control" 
                            placeholder="Phone No." 
                            value={member.phone || ''} 
                            onChange={(e) => {
                              const updated = [...editProfileData.familyMembers];
                              updated[idx] = { ...updated[idx], phone: e.target.value };
                              setEditProfileData({...editProfileData, familyMembers: updated});
                            }} 
                            style={{ fontSize: '0.85rem', padding: '0.4rem' }} 
                          />
                        </div>
                        <button 
                          type="button" 
                          className="btn btn-danger btn-icon" 
                          style={{ padding: '0.3rem', flexShrink: 0 }} 
                          onClick={() => {
                            const updated = editProfileData.familyMembers.filter((_, i) => i !== idx);
                            setEditProfileData({...editProfileData, familyMembers: updated, membersCount: updated.length || 1});
                          }}
                          title="Remove Member"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}

                    <button 
                      type="button" 
                      className="btn btn-outline" 
                      style={{ width: '100%', marginTop: '0.5rem', padding: '0.5rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }} 
                      onClick={() => {
                        const updated = [...(editProfileData.familyMembers || []), { name: '', relation: '', age: '', phone: '' }];
                        setEditProfileData({...editProfileData, familyMembers: updated, membersCount: updated.length});
                      }}
                    >
                      <Plus size={14} /> Add Another Family Member
                    </button>

                    {/* Summary Card */}
                    <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.85rem', marginTop: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                        <strong style={{ fontSize: '0.85rem' }}>Total Members: {editProfileData.familyMembers?.length || 0}</strong>
                        {selectedYatra?.pricePerPerson && (
                          <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 'bold' }}>
                            Yatra Total: ₹{((editProfileData.familyMembers?.filter(m => !m.age || parseInt(m.age) >= 5).length || 0) * parseFloat(selectedYatra.pricePerPerson)).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {editProfileData.familyMembers?.filter(m => !m.age || parseInt(m.age) >= 5).length || 0} billable member(s)
                        {(editProfileData.familyMembers?.filter(m => m.age && parseInt(m.age) < 5).length || 0) > 0 && (
                          <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>
                            {' '}(+{editProfileData.familyMembers.filter(m => m.age && parseInt(m.age) < 5).length} child under 5 yrs traveling FREE)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  style={{ flex: 1 }} 
                  onClick={() => setIsEditProfileOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ flex: 2 }}
                >
                  Save Profile Changes
                </button>
              </div>
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
              <h3>{editingParticipantId ? (t('editDevoteeTitle') || 'Edit Devotee Registration') : 'Register Devotee Details'}</h3>
              <button className="modal-close" onClick={() => { setIsAddParticipantOpen(false); setEditingParticipantId(null); setAdminAutoFilledDevotee(null); }}>×</button>
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
                        status: 'interested', paymentStatus: 'pending', approvalStatus: 'pending', isApproved: false
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
                  {(() => {
                    const adminDup = getExistingYatraParticipantByPhone(newParticipant.phone, editingParticipantId);
                    if (!adminDup) return null;
                    return (
                      <div style={{
                        marginTop: '0.5rem',
                        backgroundColor: '#fef2f2',
                        border: '1px solid #f87171',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.45rem 0.65rem',
                        color: '#991b1b',
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                      }}>
                        <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                        <span>
                          <strong>Duplicate Warning:</strong> Devotee <strong>"{adminDup.name}"</strong> is already registered in this Yatra with this number.
                        </span>
                      </div>
                    );
                  })()}
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
              <div className="grid-cols-3">
                <div className="form-group">
                  <label>{t('eligibilityStatus') || 'Yatra Eligibility'}</label>
                  <select 
                    value={newParticipant.approvalStatus || (newParticipant.isApproved ? 'approved' : 'pending')} 
                    onChange={(e) => setNewParticipant({
                      ...newParticipant, 
                      approvalStatus: e.target.value,
                      isApproved: e.target.value === 'approved'
                    })}
                  >
                    <option value="pending">{t('pendingApproval') || '⏳ Pending Approval (Locked)'}</option>
                    <option value="approved">{t('approvedEligible') || '✓ Approved Eligible (Open)'}</option>
                  </select>
                </div>
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
              {(() => {
                const adminDup = getExistingYatraParticipantByPhone(newParticipant.phone, editingParticipantId);
                return (
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    disabled={!!adminDup}
                    style={{ width: '100%', marginTop: '1rem', opacity: adminDup ? 0.6 : 1, cursor: adminDup ? 'not-allowed' : 'pointer' }}
                  >
                    {adminDup ? '⚠️ Duplicate Mobile Number (Cannot Register)' : (editingParticipantId ? `💾 ${t('saveChanges') || 'Save Changes'}` : 'Register Devotee')}
                  </button>
                );
              })()}
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
                <label>Hotel / Guesthouse *</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <button 
                    type="button" 
                    className={`btn ${!newRoom.isCustomHotel ? 'btn-primary' : 'btn-outline'}`}
                    style={{ fontSize: '0.78rem', padding: '0.3rem 0.65rem' }}
                    onClick={() => setNewRoom({ ...newRoom, isCustomHotel: false })}
                  >
                    Select Booked / Evaluated Hotel
                  </button>
                  <button 
                    type="button" 
                    className={`btn ${newRoom.isCustomHotel ? 'btn-primary' : 'btn-outline'}`}
                    style={{ fontSize: '0.78rem', padding: '0.3rem 0.65rem' }}
                    onClick={() => setNewRoom({ ...newRoom, isCustomHotel: true })}
                  >
                    + Add New Hotel / Guesthouse
                  </button>
                </div>

                {!newRoom.isCustomHotel ? (
                  <select 
                    className="form-control" 
                    value={newRoom.hotelName} 
                    onChange={(e) => {
                      const selectedH = hotels.find(h => h.name === e.target.value);
                      setNewRoom({ 
                        ...newRoom, 
                        hotelName: e.target.value,
                        hotelId: selectedH ? selectedH.id : ''
                      });
                    }}
                  >
                    <optgroup label="Booked Accommodations">
                      {hotels.filter(h => h.finalSelected).map(h => (
                        <option key={h.id} value={h.name}>✓ {h.name} (Booked)</option>
                      ))}
                    </optgroup>
                    {hotels.some(h => !h.finalSelected) && (
                      <optgroup label="Other Evaluated Hotels">
                        {hotels.filter(h => !h.finalSelected).map(h => (
                          <option key={h.id} value={h.name}>{h.name}</option>
                        ))}
                      </optgroup>
                    )}
                    {hotels.length === 0 && (
                      <option value="Primary Hotel">Primary Hotel</option>
                    )}
                  </select>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', backgroundColor: 'var(--bg)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>New Hotel / Guesthouse Name *</label>
                      <input 
                        type="text" 
                        required 
                        className="form-control" 
                        placeholder="e.g. Radha Raman Dharamshala" 
                        value={newRoom.customHotelName || ''} 
                        onChange={(e) => setNewRoom({ ...newRoom, customHotelName: e.target.value })} 
                      />
                    </div>
                    <div className="grid-cols-2">
                      <div>
                        <label style={{ fontSize: '0.75rem' }}>Address / Landmark</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          placeholder="e.g. Near Bankey Bihari Temple" 
                          value={newRoom.customHotelAddress || ''} 
                          onChange={(e) => setNewRoom({ ...newRoom, customHotelAddress: e.target.value })} 
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem' }}>Contact Person & Phone</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          placeholder="e.g. Manager (+91 9812345678)" 
                          value={newRoom.customHotelPhone || ''} 
                          onChange={(e) => setNewRoom({ ...newRoom, customHotelPhone: e.target.value })} 
                        />
                      </div>
                    </div>
                  </div>
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

              {/* Quick Bed Count Presets */}
              <div className="form-group">
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                  Quick Bed Count Presets (Select for auto-fill)
                </label>
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                  {[
                    { label: '1 Bed (Single)', count: 1, type: 'Single Bed (1 Bed)' },
                    { label: '2 Beds (Twin)', count: 2, type: 'Twin Bed (2 Beds)' },
                    { label: '3 Beds (Triple)', count: 3, type: 'Triple Bed (3 Beds)' },
                    { label: '4 Beds (Quad)', count: 4, type: 'Quad Bed (4 Beds)' },
                    { label: '5 Beds (Family Suite)', count: 5, type: '5-Bedded Family Suite (5 Beds)' },
                    { label: '6 Beds (Large Suite)', count: 6, type: '6-Bedded Large Suite (6 Beds)' }
                  ].map(preset => {
                    const isSelected = (newRoom.bedCount || newRoom.capacity) === preset.count;
                    return (
                      <button
                        key={preset.count}
                        type="button"
                        className={`btn ${isSelected ? 'btn-primary' : 'btn-outline'}`}
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.55rem', borderRadius: '4px' }}
                        onClick={() => {
                          setNewRoom({
                            ...newRoom,
                            bedCount: preset.count,
                            capacity: preset.count,
                            roomType: preset.type
                          });
                        }}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid-cols-2">
                <div className="form-group">
                  <label>Bed Count in Room (Standard Beds) *</label>
                  <input 
                    type="number" 
                    required 
                    min="1" 
                    max="15" 
                    className="form-control" 
                    placeholder="2" 
                    value={newRoom.bedCount || newRoom.capacity || 2} 
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1;
                      setNewRoom({ ...newRoom, bedCount: val, capacity: val });
                    }} 
                  />
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                    Accurate bed count used for family matching & auto-allocation
                  </small>
                </div>
                <div className="form-group">
                  <label>Room Category / Type</label>
                  <select 
                    className="form-control" 
                    value={newRoom.roomType} 
                    onChange={(e) => setNewRoom({ ...newRoom, roomType: e.target.value })}
                  >
                    <option value="Single Bed (1 Bed)">Single Bed (1 Bed)</option>
                    <option value="Twin Bed (2 Beds)">Twin Bed (2 Beds)</option>
                    <option value="Triple Bed (3 Beds)">Triple Bed (3 Beds)</option>
                    <option value="Quad Bed (4 Beds)">Quad Bed (4 Beds)</option>
                    <option value="5-Bedded Family Suite (5 Beds)">5-Bedded Family Suite (5 Beds)</option>
                    <option value="6-Bedded Large Suite (6 Beds)">6-Bedded Large Suite (6 Beds)</option>
                    <option value="Dormitory Bed">Dormitory Bed</option>
                    <option value="Deluxe Suite">Deluxe Suite</option>
                  </select>
                </div>
              </div>

              <div className="grid-cols-2">
                <div className="form-group">
                  <label>Extra Mattresses Allowed</label>
                  <select 
                    className="form-control" 
                    value={newRoom.extraMattressAllowed || 0} 
                    onChange={(e) => setNewRoom({ ...newRoom, extraMattressAllowed: parseInt(e.target.value) || 0 })}
                  >
                    <option value="0">0 Extra Mattresses</option>
                    <option value="1">1 Extra Mattress</option>
                    <option value="2">2 Extra Mattresses</option>
                    <option value="3">3 Extra Mattresses</option>
                  </select>
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                    Total Capacity: {(parseInt(newRoom.bedCount) || parseInt(newRoom.capacity) || 2) + (parseInt(newRoom.extraMattressAllowed) || 0)} Pax Max
                  </small>
                </div>
                <div className="form-group">
                  <label>Extra Mattress Cost (₹ per night)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    placeholder="500" 
                    value={newRoom.extraMattressCost || 500} 
                    onChange={(e) => setNewRoom({ ...newRoom, extraMattressCost: parseInt(e.target.value) || 0 })} 
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Special Amenities / Notes</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Attached Geyser, Balcony, Ground Floor for seniors" 
                  value={newRoom.notes || ''} 
                  onChange={(e) => setNewRoom({ ...newRoom, notes: e.target.value })} 
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                {editingRoomId ? 'Save Room Changes' : 'Add Room to Inventory'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SUPER ADMIN CONFIG SETTINGS */}
      {isSettingsOpen && isSuperAdmin && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Super Admin Settings</h3>
              <button className="modal-close" onClick={() => setIsSettingsOpen(false)}>×</button>
            </div>

            {/* Quick Action: Super Admin Audit Trail */}
            {isSuperAdmin && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fef3c7', border: '1px solid #fde68a', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <ShieldCheck size={22} style={{ color: '#d97706', flexShrink: 0 }} />
                  <div>
                    <strong style={{ color: '#92400e', fontSize: '0.88rem', display: 'block' }}>Super Admin Audit Trail & Change Log</strong>
                    <span style={{ color: '#b45309', fontSize: '0.76rem' }}>Monitor changes, registrations, profile edits, and payments across all Yatras</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', backgroundColor: '#d97706', borderColor: '#b45309', whiteSpace: 'nowrap' }}
                  onClick={() => {
                    setIsSettingsOpen(false);
                    setIsAuditTrailOpen(true);
                    loadAuditLogs();
                  }}
                >
                  View Audit Trail
                </button>
              </div>
            )}

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

              <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: 'var(--radius-sm)', padding: '0.75rem', fontSize: '0.8rem', color: '#92400e', marginTop: '0.5rem', marginBottom: '1.25rem', lineHeight: '1.45' }}>
                <strong>💡 Real-Time Multi-Device Cloud Sync:</strong>
                <div>To enable instant automatic synchronization across all admin devices without manual setup, ensure your Firebase Firestore Security Rules in the Google Cloud/Firebase console are set to <code>allow read, write: if true;</code>. You can also manually confirm admin status below anytime!</div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', marginBottom: '2rem' }}>
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
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Invite secondary administrators with temporary passwords. They will be required to create their own password on first login.</p>
            </div>

            {/* Created Admin Credentials Banner */}
            {createdAdminSuccess && (
              <div style={{ backgroundColor: 'var(--success-light)', border: '1px solid hsla(142,70%,45%,0.3)', borderRadius: 'var(--radius-sm)', padding: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontWeight: 600 }}>
                    <ShieldCheck size={18} />
                    <span>Administrator Account Ready</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setCreatedAdminSuccess(null)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.1rem' }}
                  >×</button>
                </div>
                <div style={{ fontSize: '0.85rem', marginBottom: '0.75rem', color: 'var(--text-main)' }}>
                  Share these temporary credentials with <strong>{createdAdminSuccess.name}</strong>. They will be prompted to set their own secret password when logging in:
                </div>
                <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.82rem', marginBottom: '0.75rem' }}>
                  <div><strong>Email:</strong> {createdAdminSuccess.email}</div>
                  <div><strong>Temporary Password:</strong> <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{createdAdminSuccess.password}</span></div>
                  <div><strong>Requirement:</strong> Forced password change on first login</div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button 
                    type="button" 
                    className="btn btn-primary" 
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    onClick={() => {
                      const text = `Hare Krishna ${createdAdminSuccess.name},\n\nYou have been added as an Administrator for Spiritual Yatra Management System.\n\nLogin URL: ${createdAdminSuccess.loginUrl}\nEmail: ${createdAdminSuccess.email}\nTemporary Password: ${createdAdminSuccess.password}\n\n*Note: You will be prompted to choose your personal secret password on your first login.*`;
                      navigator.clipboard.writeText(text);
                      setCopiedAdminCreds(true);
                      setTimeout(() => setCopiedAdminCreds(false), 2500);
                    }}
                  >
                    {copiedAdminCreds ? <CheckCircle size={14} /> : <Copy size={14} />}
                    {copiedAdminCreds ? 'Copied Invitation!' : 'Copy Credentials'}
                  </button>
                  {createdAdminSuccess.phone && (
                    <a 
                      href={`https://wa.me/91${createdAdminSuccess.phone.replace(/[^0-9]/g, '').slice(-10)}?text=${encodeURIComponent(`Hare Krishna ${createdAdminSuccess.name},\n\nYou have been added as an Administrator for Spiritual Yatra Management System.\n\nLogin URL: ${createdAdminSuccess.loginUrl}\nEmail: ${createdAdminSuccess.email}\nTemporary Password: ${createdAdminSuccess.password}\n\n*Note: You will be prompted to choose your personal secret password on your first login.*`)}`}
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="btn btn-outline" 
                      style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem', borderColor: '#25D366', color: '#25D366' }}
                    >
                      <MessageSquare size={14} /> Share via WhatsApp
                    </a>
                  )}
                </div>
              </div>
            )}
            
            <div style={{ marginBottom: '1.5rem' }}>
              <strong style={{ fontSize: '0.88rem', display: 'block', marginBottom: '0.5rem' }}>Configured Administrators:</strong>
              {systemUsers.filter(u => u.role === 'admin').map(user => (
                <div key={user.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: 'var(--bg)', borderRadius: 'var(--radius-sm)', marginBottom: '0.5rem', border: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <strong>{user.name || user.email}</strong>
                      {user.mustChangePassword ? (
                        <span 
                          className="badge" 
                          style={{ backgroundColor: 'var(--warning-light)', color: 'var(--warning)', fontSize: '0.7rem', cursor: 'pointer' }}
                          title="Click to toggle status to Password Active"
                          onClick={() => handleToggleAdminPasswordStatus(user)}
                        >
                          Pending 1st Login Setup
                        </span>
                      ) : (
                        <span 
                          className="badge" 
                          style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)', fontSize: '0.7rem', cursor: 'pointer' }}
                          title="Click to toggle status"
                          onClick={() => handleToggleAdminPasswordStatus(user)}
                        >
                          Password Active ✓
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      {user.email} {user.phone && `• +91 ${user.phone}`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {user.mustChangePassword ? (
                      <button 
                        type="button" 
                        className="btn btn-outline" 
                        style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem', borderColor: 'var(--success)', color: 'var(--success)' }}
                        title="Mark admin password as active / confirmed"
                        onClick={() => handleToggleAdminPasswordStatus(user)}
                      >
                        <Check size={13} /> Confirm Active
                      </button>
                    ) : (
                      <button 
                        type="button" 
                        className="btn btn-outline" 
                        style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem', borderColor: '#e2e8f0', color: 'var(--text-muted)' }}
                        title="Click to revert to pending setup"
                        onClick={() => handleToggleAdminPasswordStatus(user)}
                      >
                        Revert to Pending
                      </button>
                    )}
                    <button 
                      type="button" 
                      className="btn btn-outline" 
                      style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                      title="Copy Direct Invite / Setup Link"
                      onClick={() => {
                        const url = generateAdminInviteUrl(user);
                        const msg = `Hare Krishna ${user.name},\n\nYou have been invited as an Administrator for Spiritual Yatra Management System.\n\nClick this direct link to log in and activate your admin access:\n${url}\n\nEmail / Mobile: ${user.email} ${user.phone ? `(${user.phone})` : ''}\nTemporary Password: ${user.password}\n\n*Note: You will be prompted to set your personal secret password on first login.*`;
                        navigator.clipboard.writeText(msg);
                        alert(`Direct invite link for ${user.name} copied to clipboard! Share it via WhatsApp or Email.`);
                      }}
                    >
                      <Copy size={13} /> Copy Link
                    </button>
                    {user.phone && (
                      <a 
                        href={`https://wa.me/91${user.phone.replace(/[^0-9]/g, '').slice(-10)}?text=${encodeURIComponent(`Hare Krishna ${user.name},\n\nYou have been invited as an Administrator for Spiritual Yatra Management System.\n\nClick this direct link to log in and activate your admin access:\n${generateAdminInviteUrl(user)}\n\nEmail / Mobile: ${user.email}\nTemporary Password: ${user.password}\n\n*Note: You will be prompted to set your personal secret password on first login.*`)}`}
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="btn btn-outline" 
                        style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem', borderColor: '#25D366', color: '#25D366' }}
                        title="Share Invite on WhatsApp"
                      >
                        <MessageSquare size={13} /> WhatsApp
                      </a>
                    )}
                    <button 
                      type="button" 
                      className="btn btn-outline" 
                      style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                      title="Reset Admin Password to New Temporary Password"
                      onClick={() => handleResetAdminPassword(user)}
                    >
                      <RefreshCw size={13} /> Reset Pass
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-danger btn-icon" 
                      style={{ padding: '0.35rem' }}
                      title="Delete Admin"
                      onClick={() => handleDeleteAdmin(user.id)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
              {systemUsers.filter(u => u.role === 'admin').length === 0 && (
                <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', backgroundColor: 'var(--bg)', borderRadius: 'var(--radius-sm)' }}>
                  No extra admins invited yet.
                </div>
              )}
            </div>

            <form onSubmit={handleAddAdmin} style={{ backgroundColor: 'var(--bg)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <strong style={{ fontSize: '0.88rem', display: 'block', marginBottom: '0.75rem' }}>Invite New Administrator</strong>
              
              <div className="grid-cols-2">
                <div className="form-group">
                  <label>Full Name</label>
                  <input 
                    type="text" 
                    required 
                    className="form-control" 
                    placeholder="e.g. Ramesh Prabhu" 
                    value={newAdminName} 
                    onChange={(e) => setNewAdminName(e.target.value)} 
                  />
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input 
                    type="email" 
                    required 
                    className="form-control" 
                    placeholder="ramesh@yatra.com" 
                    value={newAdminEmail} 
                    onChange={(e) => setNewAdminEmail(e.target.value)} 
                  />
                </div>
              </div>

              <div className="grid-cols-2">
                <div className="form-group">
                  <label>Mobile Number (for WhatsApp invite)</label>
                  <input 
                    type="tel" 
                    className="form-control" 
                    placeholder="9876543210" 
                    value={newAdminPhone} 
                    onChange={(e) => setNewAdminPhone(e.target.value)} 
                  />
                </div>
                <div className="form-group">
                  <label>Initial Temporary Password</label>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <input 
                      type="text" 
                      required 
                      className="form-control" 
                      value={newAdminTempPassword} 
                      onChange={(e) => setNewAdminTempPassword(e.target.value)} 
                    />
                    <button 
                      type="button" 
                      className="btn btn-outline" 
                      style={{ flexShrink: 0, padding: '0.45rem 0.6rem' }}
                      title="Generate random password"
                      onClick={() => setNewAdminTempPassword('Yatra@' + Math.floor(1000 + Math.random() * 9000))}
                    >
                      <RefreshCw size={14} />
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                ℹ️ The admin will be prompted to replace this temporary password with their own secret password when they first log in.
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.65rem' }}>
                <Plus size={16} /> Add Administrator
              </button>
            </form>

            <hr style={{ margin: '2rem 0', borderColor: 'var(--border)' }} />

            <div style={{ marginBottom: '1rem' }}>
              <h3>Data Backup & Disaster Recovery</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Download a complete, offline JSON snapshot of all yatras, devotees, bus routes, hotel rooms, payments, and system users, or restore the database from a previous backup.
              </p>
            </div>

            <div style={{ backgroundColor: 'var(--bg)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <strong>Export Full Database Backup</strong>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Downloads all system collections into a single portable .json file.</div>
                </div>
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
                  onClick={handleExportFullBackup}
                >
                  <Download size={15} /> Download Backup (.json)
                </button>
              </div>

              <hr style={{ borderColor: 'var(--border)', margin: 0 }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <strong>Restore Database from Backup</strong>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Upload and restore a previously saved .json backup file.</div>
                </div>
                <label 
                  className="btn btn-outline" 
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer', margin: 0 }}
                >
                  <Upload size={15} /> Select Backup File
                  <input 
                    type="file" 
                    accept=".json" 
                    style={{ display: 'none' }} 
                    onChange={handleImportFullBackup} 
                  />
                </label>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: SUPER ADMIN AUDIT TRAIL & CHANGE LOG */}
      {isAuditTrailOpen && isSuperAdmin && (() => {
        // Compute filtered logs
        const filteredLogs = auditLogs.filter(log => {
          // Yatra filter
          if (auditYatraFilter !== 'all' && log.yatraId !== auditYatraFilter) {
            return false;
          }
          // Role filter
          if (auditRoleFilter !== 'all') {
            const role = (log.actor?.role || '').toLowerCase();
            if (auditRoleFilter === 'devotee' && !['devotee', 'participant', 'guest'].includes(role)) return false;
            if (auditRoleFilter === 'admin' && role !== 'admin') return false;
            if (auditRoleFilter === 'super_admin' && role !== 'super_admin') return false;
          }
          // Category filter
          if (auditCategoryFilter !== 'all') {
            if ((log.category || '').toLowerCase() !== auditCategoryFilter.toLowerCase()) return false;
          }
          // Date filter
          if (auditDateFilter !== 'all') {
            const ts = log.timestampMs || new Date(log.timestamp || 0).getTime();
            const now = Date.now();
            if (auditDateFilter === 'today') {
              const startOfToday = new Date().setHours(0, 0, 0, 0);
              if (ts < startOfToday) return false;
            } else if (auditDateFilter === '7days') {
              if (now - ts > 7 * 24 * 60 * 60 * 1000) return false;
            } else if (auditDateFilter === '30days') {
              if (now - ts > 30 * 24 * 60 * 60 * 1000) return false;
            }
          }
          // Search query
          if (auditSearchQuery && auditSearchQuery.trim()) {
            const q = auditSearchQuery.trim().toLowerCase();
            const name = (log.actor?.name || '').toLowerCase();
            const phone = (log.actor?.phone || '').toLowerCase();
            const email = (log.actor?.email || '').toLowerCase();
            const details = (log.details || '').toLowerCase();
            const action = (log.action || '').toLowerCase();
            const yatra = (log.yatraTitle || '').toLowerCase();
            const category = (log.category || '').toLowerCase();
            return name.includes(q) || phone.includes(q) || email.includes(q) || details.includes(q) || action.includes(q) || yatra.includes(q) || category.includes(q);
          }
          return true;
        });

        // Metric counts
        const totalLogsCount = auditLogs.length;
        const devoteeActionsCount = auditLogs.filter(l => ['devotee', 'participant', 'guest'].includes((l.actor?.role || '').toLowerCase())).length;
        const adminActionsCount = auditLogs.filter(l => (l.actor?.role || '').toLowerCase() === 'admin').length;
        const paymentEventsCount = auditLogs.filter(l => (l.category || '').toLowerCase() === 'payments').length;

        // Category color mapper
        const getCategoryBadgeStyle = (cat) => {
          switch ((cat || '').toLowerCase()) {
            case 'payments':
              return { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' };
            case 'participants':
              return { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
            case 'expenses':
              return { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' };
            case 'logistics':
              return { bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff' };
            case 'gallery':
              return { bg: '#f0fdfa', color: '#0f766e', border: '#99f6e4' };
            case 'admin access':
              return { bg: '#fdf2f8', color: '#be185d', border: '#fbcfe8' };
            case 'yatra settings':
            case 'yatra':
              return { bg: '#fef3c7', color: '#b45309', border: '#fde68a' };
            default:
              return { bg: 'var(--bg)', color: 'var(--text-muted)', border: 'var(--border)' };
          }
        };

        return (
          <div className="modal-overlay" style={{ zIndex: 9998 }}>
            <div className="modal-content" style={{ maxWidth: '1050px', width: '95%', maxHeight: '92vh', display: 'flex', flexDirection: 'column', padding: '1.25rem' }}>
              
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: '0.85rem', marginBottom: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <ShieldCheck size={24} style={{ color: '#d97706' }} />
                    <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Super Admin Audit Trail & Change Log</h3>
                    <span style={{ fontSize: '0.72rem', backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', borderRadius: '12px', padding: '0.15rem 0.55rem', fontWeight: 600 }}>
                      🔒 Super Admin Confidential
                    </span>
                  </div>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Tamper-evident chronological timeline of all devotee updates, registrations, cash promises, room/bus allocations, payments, and admin operations.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button 
                    type="button" 
                    className="btn btn-outline" 
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.7rem', fontSize: '0.78rem' }}
                    onClick={loadAuditLogs}
                    title="Fetch latest audit logs from cloud"
                  >
                    <RefreshCw size={13} className={isLoadingAudit ? "spin" : ""} /> {isLoadingAudit ? 'Refreshing...' : 'Refresh'}
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-primary" 
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.75rem', fontSize: '0.78rem', backgroundColor: '#d97706', borderColor: '#b45309' }}
                    onClick={() => exportAuditCsv(filteredLogs)}
                    title="Export currently filtered audit logs as CSV"
                  >
                    <Download size={13} /> Export CSV ({filteredLogs.length})
                  </button>
                  <button 
                    type="button" 
                    className="modal-close" 
                    style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1 }}
                    onClick={() => setIsAuditTrailOpen(false)}
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Stats Summary Bar */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.65rem 0.85rem' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Total Logged Events</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text)' }}>{totalLogsCount}</div>
                </div>
                <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 'var(--radius-sm)', padding: '0.65rem 0.85rem' }}>
                  <div style={{ fontSize: '0.72rem', color: '#1d4ed8' }}>Devotee Self-Updates</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1e40af' }}>{devoteeActionsCount}</div>
                </div>
                <div style={{ backgroundColor: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 'var(--radius-sm)', padding: '0.65rem 0.85rem' }}>
                  <div style={{ fontSize: '0.72rem', color: '#7e22ce' }}>Admin Operations</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#6b21a8' }}>{adminActionsCount}</div>
                </div>
                <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 'var(--radius-sm)', padding: '0.65rem 0.85rem' }}>
                  <div style={{ fontSize: '0.72rem', color: '#047857' }}>Payment & Cash Events</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#065f46' }}>{paymentEventsCount}</div>
                </div>
              </div>

              {/* Search & Filter Toolbar */}
              <div style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  
                  {/* Search Input */}
                  <div style={{ flex: '1 1 260px', position: 'relative' }}>
                    <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Search by Mobile, Devotee/Admin Name, Action, or Change..." 
                      style={{ paddingLeft: '2rem', fontSize: '0.82rem' }}
                      value={auditSearchQuery}
                      onChange={(e) => setAuditSearchQuery(e.target.value)}
                    />
                    {auditSearchQuery && (
                      <button 
                        type="button" 
                        onClick={() => setAuditSearchQuery('')}
                        style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.85rem' }}
                      >
                        ×
                      </button>
                    )}
                  </div>

                  {/* Yatra Filter */}
                  <select 
                    className="form-control" 
                    style={{ flex: '1 1 180px', fontSize: '0.82rem' }}
                    value={auditYatraFilter}
                    onChange={(e) => setAuditYatraFilter(e.target.value)}
                  >
                    <option value="all">All Yatras ({yatras.length})</option>
                    {yatras.map(y => (
                      <option key={y.id} value={y.id}>{y.name}</option>
                    ))}
                    <option value="global">System Wide / Super Admin Settings</option>
                  </select>

                  {/* Actor Role Filter */}
                  <select 
                    className="form-control" 
                    style={{ flex: '0 1 140px', fontSize: '0.82rem' }}
                    value={auditRoleFilter}
                    onChange={(e) => setAuditRoleFilter(e.target.value)}
                  >
                    <option value="all">All Roles</option>
                    <option value="devotee">👤 Devotee Only</option>
                    <option value="admin">🛡️ Admin Only</option>
                    <option value="super_admin">👑 Super Admin Only</option>
                  </select>

                  {/* Category Filter */}
                  <select 
                    className="form-control" 
                    style={{ flex: '0 1 140px', fontSize: '0.82rem' }}
                    value={auditCategoryFilter}
                    onChange={(e) => setAuditCategoryFilter(e.target.value)}
                  >
                    <option value="all">All Categories</option>
                    <option value="Participants">Participants</option>
                    <option value="Payments">Payments</option>
                    <option value="Expenses">Expenses</option>
                    <option value="Yatra Settings">Yatra Settings</option>
                    <option value="Gallery">Gallery Photos</option>
                    <option value="Admin Access">Admin Access</option>
                  </select>

                  {/* Date Filter */}
                  <select 
                    className="form-control" 
                    style={{ flex: '0 1 120px', fontSize: '0.82rem' }}
                    value={auditDateFilter}
                    onChange={(e) => setAuditDateFilter(e.target.value)}
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="7days">Last 7 Days</option>
                    <option value="30days">Last 30 Days</option>
                  </select>

                  {(auditSearchQuery || auditYatraFilter !== 'all' || auditRoleFilter !== 'all' || auditCategoryFilter !== 'all' || auditDateFilter !== 'all') && (
                    <button 
                      type="button" 
                      className="btn btn-outline" 
                      style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem' }}
                      onClick={() => {
                        setAuditSearchQuery('');
                        setAuditYatraFilter('all');
                        setAuditRoleFilter('all');
                        setAuditCategoryFilter('all');
                        setAuditDateFilter('all');
                      }}
                    >
                      Reset Filters
                    </button>
                  )}
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Showing <strong>{filteredLogs.length}</strong> of <strong>{totalLogsCount}</strong> audit events</span>
                  {filteredLogs.length > 0 && <span>Sorted chronologically (Newest on top)</span>}
                </div>
              </div>

              {/* Audit Log Timeline Feed */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.65rem', paddingRight: '0.25rem' }}>
                {filteredLogs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)', backgroundColor: 'var(--bg)', borderRadius: 'var(--radius-sm)' }}>
                    <ShieldCheck size={40} style={{ opacity: 0.35, marginBottom: '0.5rem' }} />
                    <h4 style={{ margin: '0 0 0.25rem' }}>No Audit Events Found</h4>
                    <p style={{ margin: 0, fontSize: '0.85rem' }}>
                      {auditSearchQuery || auditRoleFilter !== 'all' || auditCategoryFilter !== 'all' || auditYatraFilter !== 'all' 
                        ? 'Try clearing your search query or adjusting your filters to see more events.'
                        : 'Any updates made by devotees, admins, or super admins will appear here in real-time.'}
                    </p>
                    {(auditSearchQuery || auditRoleFilter !== 'all' || auditCategoryFilter !== 'all' || auditYatraFilter !== 'all' || auditDateFilter !== 'all') && (
                      <button 
                        type="button" 
                        className="btn btn-primary" 
                        style={{ marginTop: '0.75rem', fontSize: '0.8rem' }}
                        onClick={() => {
                          setAuditSearchQuery('');
                          setAuditYatraFilter('all');
                          setAuditRoleFilter('all');
                          setAuditCategoryFilter('all');
                          setAuditDateFilter('all');
                        }}
                      >
                        Reset All Filters
                      </button>
                    )}
                  </div>
                ) : (
                  filteredLogs.map(log => {
                    const actorRole = (log.actor?.role || '').toLowerCase();
                    const isSuper = actorRole === 'super_admin';
                    const isAdmin = actorRole === 'admin';
                    const isDevotee = !isSuper && !isAdmin;
                    const catStyle = getCategoryBadgeStyle(log.category);
                    const relTime = getRelativeTime(log.timestampMs || log.timestamp);
                    const cleanPhone = (log.actor?.phone || '').replace(/[^0-9]/g, '').slice(-10);

                    return (
                      <div 
                        key={log.id} 
                        style={{ 
                          backgroundColor: 'var(--card-bg)', 
                          border: '1px solid var(--border)', 
                          borderLeft: `4px solid ${catStyle.color}`, 
                          borderRadius: 'var(--radius-sm)', 
                          padding: '0.75rem 1rem',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                        }}
                      >
                        {/* Event Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.45rem' }}>
                          
                          {/* Actor Info */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {/* Role Badge */}
                            {isSuper && (
                              <span style={{ fontSize: '0.72rem', backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', borderRadius: '4px', padding: '0.15rem 0.45rem', fontWeight: 600 }}>
                                👑 Super Admin
                              </span>
                            )}
                            {isAdmin && (
                              <span style={{ fontSize: '0.72rem', backgroundColor: '#faf5ff', color: '#6b21a8', border: '1px solid #e9d5ff', borderRadius: '4px', padding: '0.15rem 0.45rem', fontWeight: 600 }}>
                                🛡️ Admin
                              </span>
                            )}
                            {isDevotee && (
                              <span style={{ fontSize: '0.72rem', backgroundColor: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', borderRadius: '4px', padding: '0.15rem 0.45rem', fontWeight: 600 }}>
                                👤 Devotee
                              </span>
                            )}

                            {/* Actor Name */}
                            <strong style={{ fontSize: '0.88rem', color: 'var(--text)' }}>
                              {log.actor?.name || 'Unknown User'}
                            </strong>

                            {/* Actor Mobile Number */}
                            {cleanPhone && cleanPhone.length === 10 && (
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                                📱 <strong>+91 {cleanPhone}</strong>
                                <a 
                                  href={`https://wa.me/91${cleanPhone}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ color: '#16a34a', textDecoration: 'none', marginLeft: '0.25rem', fontSize: '0.72rem' }}
                                  title="Chat with user on WhatsApp"
                                >
                                  (WhatsApp ↗)
                                </a>
                              </span>
                            )}

                            {/* Actor Email (for Admins) */}
                            {log.actor?.email && !isDevotee && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                ✉️ {log.actor.email}
                              </span>
                            )}
                          </div>

                          {/* Timestamp */}
                          <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                              {formatAuditTimestamp(log.timestamp)}
                            </div>
                            {relTime && <div style={{ fontSize: '0.7rem' }}>{relTime}</div>}
                          </div>
                        </div>

                        {/* Yatra & Action Badges */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap', marginBottom: '0.45rem' }}>
                          <span style={{ fontSize: '0.72rem', backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '4px', padding: '0.15rem 0.45rem', color: 'var(--text-muted)' }}>
                            🏛️ {log.yatraTitle || 'System Wide'}
                          </span>
                          <span style={{ fontSize: '0.72rem', backgroundColor: catStyle.bg, color: catStyle.color, border: `1px solid ${catStyle.border}`, borderRadius: '4px', padding: '0.15rem 0.45rem', fontWeight: 600 }}>
                            {log.category} • {log.action}
                          </span>
                        </div>

                        {/* Details Message */}
                        <div style={{ backgroundColor: 'var(--bg)', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem', color: 'var(--text)', lineHeight: '1.45', border: '1px solid var(--border)' }}>
                          {log.details}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

            </div>
          </div>
        );
      })()}

      {/* MODAL: FORCED FIRST LOGIN PASSWORD CHANGE */}
      {isFirstLoginOpen && firstLoginUser && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'hsla(38, 92%, 50%, 0.12)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', marginBottom: '0.75rem' }}>
                <Key size={30} />
              </div>
              <h3>Set Your Password</h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                Hare Krishna, <strong>{firstLoginUser.name || firstLoginUser.email}</strong>!<br />
                As a new administrator, please choose your personal secret password before entering the Yatra Command Center.
              </p>
            </div>

            {firstPasswordError && (
              <div style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)', border: '1px solid hsla(350,80%,55%,0.2)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.85rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                <span>{firstPasswordError}</span>
              </div>
            )}

            <form onSubmit={handleFirstLoginPasswordChange}>
              <div className="form-group">
                <label>New Secret Password</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showFirstPassword ? "text" : "password"} 
                    required 
                    className="form-control" 
                    placeholder="At least 6 characters"
                    value={newFirstPassword} 
                    onChange={(e) => setNewFirstPassword(e.target.value)} 
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowFirstPassword(!showFirstPassword)} 
                    style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
                  >
                    {showFirstPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Confirm Secret Password</label>
                <input 
                  type={showFirstPassword ? "text" : "password"} 
                  required 
                  className="form-control" 
                  placeholder="Repeat new password"
                  value={confirmFirstPassword} 
                  onChange={(e) => setConfirmFirstPassword(e.target.value)} 
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '0.75rem' }}>
                  Save & Enter Dashboard
                </button>
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  onClick={() => {
                    setIsFirstLoginOpen(false);
                    setFirstLoginUser(null);
                    setLoginPassword('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SELF CHANGE PASSWORD ANYTIME */}
      {isChangePasswordOpen && currentUser && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Key size={20} color="var(--primary)" /> Change My Password
              </h3>
              <button className="modal-close" onClick={() => setIsChangePasswordOpen(false)}>×</button>
            </div>

            {changePasswordError && (
              <div style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)', border: '1px solid hsla(350,80%,55%,0.2)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.85rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                <span>{changePasswordError}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword}>
              <div className="form-group">
                <label>Current Password</label>
                <input 
                  type="password" 
                  required 
                  className="form-control" 
                  placeholder="Enter current password"
                  value={currentChangePassword} 
                  onChange={(e) => setCurrentChangePassword(e.target.value)} 
                />
              </div>

              <div className="form-group">
                <label>New Password</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showChangePassword ? "text" : "password"} 
                    required 
                    className="form-control" 
                    placeholder="At least 6 characters"
                    value={newChangePassword} 
                    onChange={(e) => setNewChangePassword(e.target.value)} 
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowChangePassword(!showChangePassword)} 
                    style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
                  >
                    {showChangePassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Confirm New Password</label>
                <input 
                  type={showChangePassword ? "text" : "password"} 
                  required 
                  className="form-control" 
                  placeholder="Repeat new password"
                  value={confirmChangePassword} 
                  onChange={(e) => setConfirmChangePassword(e.target.value)} 
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Update Password
                </button>
                <button type="button" className="btn btn-outline" onClick={() => setIsChangePasswordOpen(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: PRINTABLE DEVOTEE BADGES & LANYARD PASSES          */}
      {/* ========================================================= */}
      {isPrintBadgesOpen && selectedYatra && (() => {
        // Determine devotee list
        const sourceParticipants = singleBadgeParticipant 
          ? [singleBadgeParticipant]
          : participants.filter(p => p.status !== 'cancelled');

        // Filter by bus
        const busFiltered = badgeFilterBus === 'all' 
          ? sourceParticipants 
          : sourceParticipants.filter(p => p.busId === badgeFilterBus);

        // Filter by hotel
        const hotelFiltered = badgeFilterHotel === 'all'
          ? busFiltered
          : busFiltered.filter(p => {
              if (p.roomId) {
                const r = rooms.find(room => room.id === p.roomId);
                return r && (r.hotelId === badgeFilterHotel || r.hotelName === badgeFilterHotel);
              }
              return false;
            });

        // Expand families into individual badges so each member gets their own lanyard pass
        const badgeCards = [];
        hotelFiltered.forEach(p => {
          const pBus = buses.find(b => b.id === p.busId);
          const pRoom = rooms.find(r => r.id === p.roomId);
          const pHotel = hotels.find(h => h.id === pRoom?.hotelId || h.name === pRoom?.hotelName) || hotels.find(h => h.finalSelected) || hotels[0];

          if (p.type === 'family' && p.familyMembers && Array.isArray(p.familyMembers) && p.familyMembers.length > 0) {
            p.familyMembers.forEach((m, mIdx) => {
              const mRoomId = m.roomId || p.roomId;
              const mRoom = rooms.find(r => r.id === mRoomId) || pRoom;
              const mHotel = hotels.find(h => h.id === mRoom?.hotelId || h.name === mRoom?.hotelName) || pHotel;

              badgeCards.push({
                badgeId: `${p.id}_${mIdx}`,
                regNumber: `YTR-${selectedYatra.id.slice(-4).toUpperCase()}-${p.id.slice(-4).toUpperCase()}-${mIdx + 1}`,
                name: m.name || `${p.name} (Member ${mIdx + 1})`,
                role: m.relation === 'Self' ? 'Primary Devotee' : 'Family Pilgrim',
                subText: `${p.familyName || p.name} • ${m.relation || 'Member'}${m.age ? ` (${m.age} yrs)` : ''}`,
                phone: m.phone || p.phone,
                location: p.location || selectedYatra.destination,
                travelMode: p.travelMode,
                bus: pBus,
                hotel: mHotel,
                room: mRoom,
                qrUrl: `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`${window.location.origin}${window.location.pathname}#/login`)}`
              });
            });
          } else {
            // Individual devotee
            badgeCards.push({
              badgeId: p.id,
              regNumber: `YTR-${selectedYatra.id.slice(-4).toUpperCase()}-${p.id.slice(-4).toUpperCase()}`,
              name: p.name,
              role: 'Yatra Pilgrim',
              subText: `${p.location || 'Pilgrim'} • Individual Seat`,
              phone: p.phone,
              location: p.location || selectedYatra.destination,
              travelMode: p.travelMode,
              bus: pBus,
              hotel: pHotel,
              room: pRoom,
              qrUrl: `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`${window.location.origin}${window.location.pathname}#/login`)}`
            });
          }
        });

        return (
          <div 
            className="modal-overlay badges-modal-overlay"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsPrintBadgesOpen(false);
                setSingleBadgeParticipant(null);
              }
            }}
          >
            {/* Always-visible Floating Top-Right Close Button */}
            <button 
              type="button" 
              className="floating-close-badge-btn no-print"
              onClick={() => {
                setIsPrintBadgesOpen(false);
                setSingleBadgeParticipant(null);
              }}
              title="Close Preview (or press Esc)"
            >
              ✕ Close Preview
            </button>

            <div className="badges-modal-container">
              {/* Sticky Top Control Toolbar (Always stays pinned on screen) */}
              <div className="no-print badges-modal-sticky-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Printer size={22} style={{ color: 'var(--primary)' }} />
                      <h3 style={{ margin: 0 }}>{t('printBadges')}</h3>
                      <span className="badge badge-confirmed">{badgeCards.length} {badgeCards.length === 1 ? 'Badge' : 'Badges'}</span>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '0.2rem 0 0' }}>
                      {singleBadgeParticipant 
                        ? `Printing badge for ${singleBadgeParticipant.name} (${badgeCards.length} member pass${badgeCards.length > 1 ? 'es' : ''})`
                        : `Generating printable badges for ${selectedYatra.name}`}
                    </p>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button 
                      type="button"
                      className="btn btn-primary" 
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1.1rem', fontSize: '0.9rem', fontWeight: 600 }}
                      onClick={() => window.print()}
                    >
                      <Printer size={16} /> Print Now (A4 / Cardstock)
                    </button>
                    <button 
                      type="button"
                      className="btn btn-outline" 
                      style={{ padding: '0.55rem 1rem', fontSize: '0.9rem', fontWeight: 600 }}
                      onClick={() => {
                        setIsPrintBadgesOpen(false);
                        setSingleBadgeParticipant(null);
                      }}
                    >
                      ✕ Close Preview
                    </button>
                  </div>
                </div>

                {/* Filters Bar (Only shown when printing all) */}
                {!singleBadgeParticipant && (
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', backgroundColor: 'var(--bg)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                      <strong>Filter Bus:</strong>
                      <select 
                        className="form-control" 
                        style={{ width: 'auto', padding: '0.3rem 0.6rem', fontSize: '0.82rem' }}
                        value={badgeFilterBus} 
                        onChange={(e) => setBadgeFilterBus(e.target.value)}
                      >
                        <option value="all">All Buses ({buses.length})</option>
                        {buses.map(b => (
                          <option key={b.id} value={b.id}>{b.name} ({b.busNumber || 'Coach'})</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                      <strong>Filter Hotel:</strong>
                      <select 
                        className="form-control" 
                        style={{ width: 'auto', padding: '0.3rem 0.6rem', fontSize: '0.82rem' }}
                        value={badgeFilterHotel} 
                        onChange={(e) => setBadgeFilterHotel(e.target.value)}
                      >
                        <option value="all">All Hotels ({hotels.length})</option>
                        {hotels.map(h => (
                          <option key={h.id} value={h.id}>{h.name}</option>
                        ))}
                      </select>
                    </div>

                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                      💡 Tip: Set layout to <strong>Portrait</strong> in print dialog. Badges print 4 per page with cutting guides.
                    </span>
                  </div>
                )}
              </div>

              {/* Printable Badges Container */}
              <div className="badges-print-view" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem', justifyContent: 'center' }}>
                {badgeCards.map((b) => (
                  <div 
                    key={b.badgeId} 
                    className="badge-cut-guide"
                    style={{
                      width: '100%',
                      maxWidth: '380px',
                      margin: '0 auto',
                      border: '2px dashed #94a3b8',
                      borderRadius: '12px',
                      backgroundColor: '#ffffff',
                      color: '#1e293b',
                      overflow: 'hidden',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.06)',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    {/* Spiritual Saffron Top Header */}
                    <div style={{
                      background: 'linear-gradient(135deg, #b45309 0%, #d97706 50%, #92400e 100%)',
                      color: '#ffffff',
                      padding: '0.75rem 1rem',
                      textAlign: 'center',
                      position: 'relative'
                    }}>
                      <div style={{ fontSize: '0.68rem', letterSpacing: '1.5px', fontWeight: '700', textTransform: 'uppercase', color: '#fef3c7', marginBottom: '0.15rem' }}>
                        {t('badgeHeader')}
                      </div>
                      <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#ffffff', fontWeight: 800 }}>
                        {selectedYatra.name}
                      </h3>
                      <div style={{ fontSize: '0.72rem', color: '#fef3c7', marginTop: '0.15rem' }}>
                        📍 {selectedYatra.destination} • 📅 {selectedYatra.startDate} to {selectedYatra.endDate}
                      </div>
                    </div>

                    {/* Devotee Identity Band */}
                    <div style={{ padding: '0.85rem 1rem', textAlign: 'center', borderBottom: '1px solid #e2e8f0', backgroundColor: '#fffbeb' }}>
                      <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', color: '#b45309', backgroundColor: '#fef3c7', padding: '0.2rem 0.6rem', borderRadius: '1rem', border: '1px solid #fde68a' }}>
                        {b.role}
                      </span>
                      <h2 style={{ margin: '0.35rem 0 0.15rem', fontSize: '1.35rem', color: '#1e293b', fontWeight: 800 }}>
                        {b.name}
                      </h2>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                        {b.subText}
                      </div>
                      <div style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: '#94a3b8', marginTop: '0.25rem' }}>
                        {b.regNumber}
                      </div>
                    </div>

                    {/* Logistics Assignment Cards (Bus & Hotel) */}
                    <div style={{ padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', flex: 1, backgroundColor: '#ffffff' }}>
                      
                      {/* BUS CARD */}
                      <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.6rem 0.75rem', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                        <span style={{ fontSize: '1.4rem' }}>🚌</span>
                        <div style={{ flex: 1, fontSize: '0.8rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong style={{ color: '#0f172a', fontSize: '0.85rem' }}>
                              {b.travelMode === 'self' ? 'Self Travel Arrangement' : (b.bus?.name || 'Bus Seat Allocated')}
                            </strong>
                            {b.bus?.busNumber && (
                              <span style={{ backgroundColor: '#e2e8f0', color: '#334155', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>
                                {b.bus.busNumber}
                              </span>
                            )}
                          </div>
                          {b.travelMode === 'self' ? (
                            <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.15rem' }}>Independent Travel to {selectedYatra.destination}</div>
                          ) : (
                            <>
                              <div style={{ color: '#475569', fontSize: '0.75rem', marginTop: '0.15rem' }}>
                                ⏰ Departs: <strong>{b.bus?.departureTime || '06:00 AM (Day 1)'}</strong> | 📍 {b.bus?.boardingPoint || 'Assembly Point'}
                              </div>
                              {b.bus?.coordinatorName && (
                                <div style={{ color: '#64748b', fontSize: '0.72rem', marginTop: '0.15rem' }}>
                                  Coord: {b.bus.coordinatorName} ({b.bus.coordinatorPhone || '—'})
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* HOTEL & ROOM CARD */}
                      <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.6rem 0.75rem', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                        <span style={{ fontSize: '1.4rem' }}>🏨</span>
                        <div style={{ flex: 1, fontSize: '0.8rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong style={{ color: '#0f172a', fontSize: '0.85rem' }}>
                              {b.hotel?.name || 'Yatra Hotel / Guesthouse'}
                            </strong>
                            <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>
                              {b.room ? `Room ${b.room.roomNumber}` : 'Stay Allocated'}
                            </span>
                          </div>
                          <div style={{ color: '#475569', fontSize: '0.75rem', marginTop: '0.15rem' }}>
                            {b.room?.roomType || 'Standard Room'}{b.room?.bedCount ? ` (${b.room.bedCount} Beds)` : ''} {b.room?.floor ? `• ${b.room.floor}` : ''}
                          </div>
                          <div style={{ color: '#64748b', fontSize: '0.72rem', marginTop: '0.15rem' }}>
                            {b.hotel?.address || selectedYatra.destination} {b.hotel?.phone ? `• Ph: ${b.hotel.phone}` : ''}
                          </div>
                        </div>
                      </div>

                      {/* QR CODE & VERIFICATION BAND */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem', marginTop: '0.2rem' }}>
                        <img 
                          src={b.qrUrl} 
                          alt="Devotee Pass QR" 
                          style={{ width: '64px', height: '64px', borderRadius: '4px', border: '1px solid #e2e8f0' }} 
                        />
                        <div style={{ fontSize: '0.72rem', color: '#64748b', lineHeight: '1.3' }}>
                          <strong style={{ color: '#0f172a', display: 'block', fontSize: '0.76rem' }}>{t('scanForLivePass')}</strong>
                          Scan with any phone camera to verify seat & room reservation.
                          <div style={{ color: '#059669', fontWeight: 600, marginTop: '0.15rem' }}>✓ Official Pilgrimage Badge</div>
                        </div>
                      </div>
                    </div>

                    {/* Footer Mantra & Emergency Helpline */}
                    <div style={{ backgroundColor: '#f1f5f9', borderTop: '1px solid #e2e8f0', padding: '0.5rem 0.75rem', textAlign: 'center', fontSize: '0.68rem', color: '#475569' }}>
                      <div style={{ fontWeight: 700, color: '#d97706', marginBottom: '0.15rem' }}>
                        {t('badgeMantra')}
                      </div>
                      <div style={{ color: '#64748b', fontSize: '0.65rem' }}>
                        🚨 {t('badgeEmergency')}: <strong>+91 {selectedYatra.upiName || 'Admin'}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Action Footer (Hidden in print) */}
              <div className="no-print" style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  style={{ padding: '0.65rem 1.5rem', fontWeight: 600, fontSize: '0.9rem' }} 
                  onClick={() => window.print()}
                >
                  <Printer size={16} /> Print Now (A4 / Cardstock)
                </button>
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  style={{ padding: '0.65rem 1.5rem', fontWeight: 600, fontSize: '0.9rem' }} 
                  onClick={() => {
                    setIsPrintBadgesOpen(false);
                    setSingleBadgeParticipant(null);
                  }}
                >
                  ✕ Close Preview / Cancel
                </button>
              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
}
