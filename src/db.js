import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, addDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';

// Default Demo Data to populate when db is empty
const DEMO_DATA = {
  users: [
    { id: 'super_admin_1', email: 'rohit.wadhwani83@gmail.com', role: 'super_admin', name: 'Rohit Wadhwani', phone: '+919876543210' },
    { id: 'admin_1', email: 'admin@yatra.com', role: 'admin', name: 'Krishna Das', phone: '+919999988888' }
  ],
  yatras: [
    {
      id: 'yatra_vrindavan_2026',
      name: 'Vrindavan Dham Yatra',
      destination: 'Vrindavan, Uttar Pradesh',
      startDate: '2026-10-15',
      endDate: '2026-10-20',
      expectedParticipants: 45,
      status: 'registration_open',
      upiId: 'rohit.wadhwani83@okaxis',
      upiName: 'Rohit Wadhwani'
    },
    {
      id: 'yatra_puri_2026',
      name: 'Jagannath Puri Yatra',
      destination: 'Puri, Odisha',
      startDate: '2026-11-12',
      endDate: '2026-11-17',
      expectedParticipants: 50,
      status: 'planning',
      upiId: 'rohit.wadhwani83@okaxis',
      upiName: 'Rohit Wadhwani'
    }
  ],
  hotels: [
    {
      id: 'h1',
      yatraId: 'yatra_vrindavan_2026',
      name: 'MVT Guesthouse',
      address: 'Behind ISKCON Temple, Raman Reti, Vrindavan',
      gmapsLink: 'https://maps.google.com/?q=MVT+Guesthouse+Vrindavan',
      bookingLink: 'https://booking.com',
      contactPerson: 'Syamasundara Das',
      phone: '+919812345678',
      roomsAvailable: 15,
      roomPrice: 3200,
      extraMattressCost: 500,
      distanceFromTemple: '100m',
      notes: 'Very clean, inside temple compound, highly recommended.',
      contacted: true,
      shortlisted: true,
      finalSelected: true,
      quoteImageUrl: ''
    },
    {
      id: 'h2',
      yatraId: 'yatra_vrindavan_2026',
      name: 'Krishna Balaram Residency',
      address: 'Chhatikara Road, Vrindavan',
      gmapsLink: 'https://maps.google.com/?q=Krishna+Balaram+Residency+Vrindavan',
      bookingLink: 'https://booking.com',
      contactPerson: 'Manager Gauranga',
      phone: '+919898989898',
      roomsAvailable: 25,
      roomPrice: 2400,
      extraMattressCost: 400,
      distanceFromTemple: '1.2km',
      notes: 'Good rooms, requires auto-rickshaw to temple.',
      contacted: true,
      shortlisted: true,
      finalSelected: false,
      quoteImageUrl: ''
    }
  ],
  participants: [
    {
      id: 'p1',
      yatraId: 'yatra_vrindavan_2026',
      name: 'Ramesh Sharma',
      phone: '9876543210',
      email: 'ramesh@gmail.com',
      city: 'Mumbai',
      type: 'family',
      familyName: 'Sharma Family',
      membersCount: 4,
      memberDetails: 'Ramesh (45), Sunita (42), Amit (18), Neha (14)',
      specialRequirements: 'Ground floor room required for elders.',
      medicalNotes: 'Mother has joint pain, cannot walk long distances.',
      remarks: 'First yatra with us.',
      status: 'confirmed',
      paymentStatus: 'completed'
    },
    {
      id: 'p2',
      yatraId: 'yatra_vrindavan_2026',
      name: 'Aditi Patel',
      phone: '9123456789',
      email: 'aditi.patel@yahoo.com',
      city: 'Ahmedabad',
      type: 'individual',
      familyName: '',
      membersCount: 1,
      memberDetails: 'Aditi (28)',
      specialRequirements: 'Pure sattvic diet without onion/garlic.',
      medicalNotes: 'None',
      remarks: 'Active volunteer.',
      status: 'confirmed',
      paymentStatus: 'completed'
    },
    {
      id: 'p3',
      yatraId: 'yatra_vrindavan_2026',
      name: 'Sanjay Gupta',
      phone: '8765432109',
      email: 'sanjay.g@rediff.com',
      city: 'Delhi',
      type: 'family',
      familyName: 'Gupta Family',
      membersCount: 3,
      memberDetails: 'Sanjay (50), Rekha (46), Divya (21)',
      specialRequirements: 'None',
      medicalNotes: 'Father is diabetic.',
      remarks: 'Interested in registration.',
      status: 'interested',
      paymentStatus: 'pending'
    }
  ],
  payments: [
    {
      id: 'pay1',
      yatraId: 'yatra_vrindavan_2026',
      participantId: 'p1',
      amountPaid: 12000,
      transactionRef: 'UPI98234823423',
      paymentDate: '2026-07-01',
      screenshotUrl: 'https://images.unsplash.com/photo-1601597111158-2fceff292cdc?w=300&auto=format&fit=crop',
      status: 'verified'
    },
    {
      id: 'pay2',
      yatraId: 'yatra_vrindavan_2026',
      participantId: 'p2',
      amountPaid: 3000,
      transactionRef: 'UPI12401823048',
      paymentDate: '2026-07-02',
      screenshotUrl: 'https://images.unsplash.com/photo-1601597111158-2fceff292cdc?w=300&auto=format&fit=crop',
      status: 'verified'
    }
  ],
  expenses: [
    {
      id: 'e1',
      yatraId: 'yatra_vrindavan_2026',
      date: '2026-07-02',
      category: 'transport',
      amount: 15000,
      paidBy: 'Rohit Wadhwani',
      remarks: 'Bus advance payment from Delhi to Vrindavan',
      billImageUrl: '',
      appliesTo: 'everyone',
      targetIds: []
    },
    {
      id: 'e2',
      yatraId: 'yatra_vrindavan_2026',
      date: '2026-07-05',
      category: 'food',
      amount: 3000,
      paidBy: 'Rohit Wadhwani',
      remarks: 'Lunch prasadam booking at Govindas restaurant',
      billImageUrl: '',
      appliesTo: 'everyone',
      targetIds: []
    }
  ],
  photos: [
    {
      id: 'ph1',
      yatraId: 'yatra_vrindavan_2026',
      uploader: 'Aditi Patel',
      date: '2026-07-03',
      caption: 'Mangala Arati at Sri Krishna Balaram Mandir',
      imageUrl: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800&auto=format&fit=crop'
    }
  ],
  notes: [
    {
      id: 'n1',
      yatraId: 'yatra_vrindavan_2026',
      content: JSON.stringify({
        general: "Temple Timings:\n- Bankey Bihari: 7:45 AM - 12:00 PM, 5:30 PM - 9:30 PM\n- Prem Mandir: 8:30 AM - 12:00 PM, 4:30 PM - 8:30 PM\n- Radhamanohar: 6:00 AM - 11:00 AM\n\nLocal Pandit: Shastri Ji (+91 94123 45678)\nBus Driver: Raju Bhai (+91 98987 65432)",
        checklist: [
          { id: 'c1', text: 'Book AC bus from Delhi', checked: true },
          { id: 'c2', text: 'Confirm rooms at MVT', checked: true },
          { id: 'c3', text: 'Order standard lunch plates', checked: false },
          { id: 'c4', text: 'Obtain permits for Parikrama', checked: false }
        ]
      })
    }
  ],
  documents: [
    {
      id: 'd1',
      yatraId: 'yatra_vrindavan_2026',
      name: 'MVT Hotel Quote Invoice.pdf',
      type: 'pdf',
      fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      uploadDate: '2026-07-01'
    }
  ]
};

// Database helper using LocalStorage with Firebase support
class Database {
  constructor() {
    this.firebaseApp = null;
    this.firestore = null;
    this.isFirebaseReady = false;

    // Load Firebase Config if saved in LocalStorage
    const savedConfig = localStorage.getItem('yatra_firebase_config');
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        this.initializeFirebase(config);
      } catch (e) {
        console.error("Failed to parse saved Firebase config", e);
      }
    }

    // Initialize LocalStorage with Demo Data if completely empty
    this.initLocalStorageDemo();
  }

  initLocalStorageDemo() {
    Object.keys(DEMO_DATA).forEach(key => {
      const storageKey = `yatra_mgr_${key}`;
      if (!localStorage.getItem(storageKey)) {
        localStorage.setItem(storageKey, JSON.stringify(DEMO_DATA[key]));
      }
    });
  }

  initializeFirebase(config) {
    try {
      if (getApps().length === 0) {
        this.firebaseApp = initializeApp(config);
      }
      this.firestore = getFirestore(this.firebaseApp);
      this.isFirebaseReady = true;
      localStorage.setItem('yatra_firebase_config', JSON.stringify(config));
      console.log("Firebase initialized successfully!");
      return true;
    } catch (error) {
      console.error("Firebase init error: ", error);
      this.isFirebaseReady = false;
      return false;
    }
  }

  disableFirebase() {
    this.firebaseApp = null;
    this.firestore = null;
    this.isFirebaseReady = false;
    localStorage.removeItem('yatra_firebase_config');
  }

  // --- Generic Data Operations ---
  async getCollection(collectionName) {
    if (this.isFirebaseReady) {
      try {
        const querySnapshot = await getDocs(collection(this.firestore, collectionName));
        const list = [];
        querySnapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() });
        });
        return list;
      } catch (err) {
        console.warn("Firestore read failed, falling back to LocalStorage:", err);
      }
    }
    return JSON.parse(localStorage.getItem(`yatra_mgr_${collectionName}`) || '[]');
  }

  async setDocument(collectionName, id, data) {
    if (this.isFirebaseReady) {
      try {
        const docRef = doc(this.firestore, collectionName, id);
        await setDoc(docRef, data, { merge: true });
        return { id, ...data };
      } catch (err) {
        console.warn("Firestore write failed, falling back to LocalStorage:", err);
      }
    }
    const list = JSON.parse(localStorage.getItem(`yatra_mgr_${collectionName}`) || '[]');
    const index = list.findIndex(item => item.id === id);
    const updatedItem = { id, ...data };
    if (index >= 0) {
      list[index] = { ...list[index], ...data };
    } else {
      list.push(updatedItem);
    }
    localStorage.setItem(`yatra_mgr_${collectionName}`, JSON.stringify(list));
    return updatedItem;
  }

  async addDocument(collectionName, data) {
    const id = data.id || Math.random().toString(36).substring(2, 11);
    const newItem = { ...data, id };
    if (this.isFirebaseReady) {
      try {
        const docRef = doc(this.firestore, collectionName, id);
        await setDoc(docRef, newItem);
        return newItem;
      } catch (err) {
        console.warn("Firestore write failed, falling back to LocalStorage:", err);
      }
    }
    const list = JSON.parse(localStorage.getItem(`yatra_mgr_${collectionName}`) || '[]');
    list.push(newItem);
    localStorage.setItem(`yatra_mgr_${collectionName}`, JSON.stringify(list));
    return newItem;
  }

  async updateDocument(collectionName, id, updates) {
    if (this.isFirebaseReady) {
      try {
        const docRef = doc(this.firestore, collectionName, id);
        await updateDoc(docRef, updates);
        // Get updated doc
        const updatedDoc = await getDoc(docRef);
        return { id, ...updatedDoc.data() };
      } catch (err) {
        console.warn("Firestore update failed, falling back to LocalStorage:", err);
      }
    }
    const list = JSON.parse(localStorage.getItem(`yatra_mgr_${collectionName}`) || '[]');
    const index = list.findIndex(item => item.id === id);
    if (index >= 0) {
      list[index] = { ...list[index], ...updates };
      localStorage.setItem(`yatra_mgr_${collectionName}`, JSON.stringify(list));
      return list[index];
    }
    throw new Error(`Document with id ${id} not found in ${collectionName}`);
  }

  async deleteDocument(collectionName, id) {
    if (this.isFirebaseReady) {
      try {
        await deleteDoc(doc(this.firestore, collectionName, id));
        return true;
      } catch (err) {
        console.warn("Firestore delete failed, falling back to LocalStorage:", err);
      }
    }
    const list = JSON.parse(localStorage.getItem(`yatra_mgr_${collectionName}`) || '[]');
    const filtered = list.filter(item => item.id !== id);
    localStorage.setItem(`yatra_mgr_${collectionName}`, JSON.stringify(filtered));
    return true;
  }

  // --- Specific API Wrappers ---
  async getUsers() { return this.getCollection('users'); }
  async addUser(user) { return this.addDocument('users', user); }
  async deleteUser(id) { return this.deleteDocument('users', id); }

  async getYatras() { return this.getCollection('yatras'); }
  async addYatra(yatra) { return this.addDocument('yatras', yatra); }
  async updateYatra(id, updates) { return this.updateDocument('yatras', id, updates); }
  async deleteYatra(id) { return this.deleteDocument('yatras', id); }
  async softDeleteYatra(id) { return this.updateDocument('yatras', id, { isDeleted: true }); }
  async restoreYatra(id) { return this.updateDocument('yatras', id, { isDeleted: false }); }

  async getHotels(yatraId) {
    const all = await this.getCollection('hotels');
    return all.filter(h => h.yatraId === yatraId);
  }
  async addHotel(hotel) { return this.addDocument('hotels', hotel); }
  async updateHotel(id, updates) { return this.updateDocument('hotels', id, updates); }
  async deleteHotel(id) { return this.deleteDocument('hotels', id); }

  async getParticipants(yatraId) {
    const all = await this.getCollection('participants');
    return all.filter(p => p.yatraId === yatraId);
  }
  async addParticipant(participant) { return this.addDocument('participants', participant); }
  async updateParticipant(id, updates) { return this.updateDocument('participants', id, updates); }
  async deleteParticipant(id) { return this.deleteDocument('participants', id); }

  async getPayments(yatraId) {
    const all = await this.getCollection('payments');
    return all.filter(pay => pay.yatraId === yatraId);
  }
  async addPayment(payment) { return this.addDocument('payments', payment); }
  async updatePayment(id, updates) { return this.updateDocument('payments', id, updates); }
  async deletePayment(id) { return this.deleteDocument('payments', id); }

  async getExpenses(yatraId) {
    const all = await this.getCollection('expenses');
    return all.filter(e => e.yatraId === yatraId);
  }
  async addExpense(expense) { return this.addDocument('expenses', expense); }
  async updateExpense(id, updates) { return this.updateDocument('expenses', id, updates); }
  async deleteExpense(id) { return this.deleteDocument('expenses', id); }

  async getPhotos(yatraId) {
    const all = await this.getCollection('photos');
    return all.filter(ph => ph.yatraId === yatraId);
  }
  async addPhoto(photo) { return this.addDocument('photos', photo); }
  async deletePhoto(id) { return this.deleteDocument('photos', id); }

  async getNotes(yatraId) {
    const all = await this.getCollection('notes');
    const yatraNotes = all.find(n => n.yatraId === yatraId);
    if (!yatraNotes) {
      // Create empty notes object
      const defaultNotes = {
        yatraId,
        content: JSON.stringify({ general: '', checklist: [] })
      };
      return this.addDocument('notes', defaultNotes);
    }
    return yatraNotes;
  }
  async updateNotes(id, updates) { return this.updateDocument('notes', id, updates); }

  async getDocuments(yatraId) {
    const all = await this.getCollection('documents');
    return all.filter(d => d.yatraId === yatraId);
  }
  async addDocumentRecord(docRec) { return this.addDocument('documents', docRec); }
  async deleteDocumentRecord(id) { return this.deleteDocument('documents', id); }

  // Sync Local Storage Data to Firestore (called when connecting Firebase)
  async syncLocalToFirestore() {
    if (!this.isFirebaseReady) return false;
    for (const key of Object.keys(DEMO_DATA)) {
      const localData = JSON.parse(localStorage.getItem(`yatra_mgr_${key}`) || '[]');
      for (const item of localData) {
        await this.setDocument(key, item.id, item);
      }
    }
    return true;
  }
}

export const db = new Database();
export default db;
