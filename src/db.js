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
      finalSelected: true,
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
      location: 'Mumbai',
      type: 'family',
      familyName: 'Sharma Family',
      membersCount: 4,
      familyMembers: [
        { name: 'Ramesh Sharma', relation: 'Self', age: 45, phone: '9876543210' },
        { name: 'Sunita Sharma', relation: 'Spouse', age: 42, phone: '9876543211' },
        { name: 'Amit Sharma', relation: 'Son', age: 18, phone: '' },
        { name: 'Neha Sharma', relation: 'Daughter', age: 14, phone: '' }
      ],
      memberDetails: 'Ramesh (45), Sunita (42), Amit (18), Neha (14)',
      travelMode: 'self',
      travelType: 'rail',
      boardingStation: 'Mumbai Central',
      droppingStation: 'Mathura',
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
      location: 'Ahmedabad',
      type: 'individual',
      familyName: '',
      membersCount: 1,
      familyMembers: [
        { name: 'Aditi Patel', relation: 'Self', age: 28, phone: '9123456789' }
      ],
      memberDetails: 'Aditi (28)',
      travelMode: 'organised',
      travelType: '',
      boardingStation: '',
      droppingStation: '',
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
      location: 'Delhi',
      type: 'family',
      familyName: 'Gupta Family',
      membersCount: 3,
      familyMembers: [
        { name: 'Sanjay Gupta', relation: 'Self', age: 50, phone: '8765432109' },
        { name: 'Rekha Gupta', relation: 'Spouse', age: 46, phone: '' },
        { name: 'Divya Gupta', relation: 'Daughter', age: 21, phone: '' }
      ],
      memberDetails: 'Sanjay (50), Rekha (46), Divya (21)',
      travelMode: 'self',
      travelType: 'road',
      boardingStation: '',
      droppingStation: '',
      remarks: 'Interested in registration.',
      status: 'interested',
      paymentStatus: 'pending'
    },
    {
      id: 'p4',
      yatraId: 'yatra_vrindavan_2026',
      name: 'Gaurav Kulkarni',
      phone: '9822012345',
      email: 'gaurav.kulkarni@gmail.com',
      location: 'Pune',
      type: 'family',
      familyName: 'Kulkarni Family',
      membersCount: 4,
      familyMembers: [
        { name: 'Gaurav Kulkarni', relation: 'Self', age: 40, phone: '9822012345' },
        { name: 'Priya Kulkarni', relation: 'Spouse', age: 37, phone: '' },
        { name: 'Vivaan Kulkarni', relation: 'Son', age: 10, phone: '' },
        { name: 'Ananya Kulkarni', relation: 'Daughter', age: 4, phone: '' }
      ],
      memberDetails: 'Gaurav (40), Priya (37), Vivaan (10), Ananya (4)',
      travelMode: 'organised',
      travelType: '',
      boardingStation: '',
      droppingStation: '',
      remarks: 'Traveling by organizer bus with family.',
      status: 'confirmed',
      paymentStatus: 'completed'
    },
    {
      id: 'p5',
      yatraId: 'yatra_vrindavan_2026',
      name: 'Radhika Verma',
      phone: '9811098765',
      email: 'radhika.v@gmail.com',
      location: 'Delhi',
      type: 'family',
      familyName: 'Verma Family',
      membersCount: 3,
      familyMembers: [
        { name: 'Radhika Verma', relation: 'Self', age: 34, phone: '9811098765' },
        { name: 'Manish Verma', relation: 'Spouse', age: 36, phone: '' },
        { name: 'Aryan Verma', relation: 'Son', age: 8, phone: '' }
      ],
      memberDetails: 'Radhika (34), Manish (36), Aryan (8)',
      travelMode: 'organised',
      travelType: '',
      boardingStation: '',
      droppingStation: '',
      remarks: 'Prefers front seats if possible.',
      status: 'confirmed',
      paymentStatus: 'completed'
    },
    {
      id: 'p6',
      yatraId: 'yatra_vrindavan_2026',
      name: 'Vikram Singhal',
      phone: '9711234567',
      email: 'vikram.s@outlook.com',
      location: 'Noida',
      type: 'individual',
      familyName: '',
      membersCount: 1,
      familyMembers: [
        { name: 'Vikram Singhal', relation: 'Self', age: 31, phone: '9711234567' }
      ],
      memberDetails: 'Vikram (31)',
      travelMode: 'organised',
      travelType: '',
      boardingStation: '',
      droppingStation: '',
      remarks: 'Volunteer coordinator.',
      status: 'confirmed',
      paymentStatus: 'completed'
    }
  ],
  devotee_profiles: [
    {
      id: 'devotee_9876543210',
      cleanPhone: '9876543210',
      phone: '9876543210',
      name: 'Ramesh Sharma',
      email: 'ramesh@gmail.com',
      location: 'Mumbai',
      type: 'family',
      familyName: 'Sharma Family',
      membersCount: 4,
      familyMembers: [
        { name: 'Ramesh Sharma', relation: 'Self', age: 45, phone: '9876543210' },
        { name: 'Sunita Sharma', relation: 'Spouse', age: 42, phone: '9876543211' },
        { name: 'Amit Sharma', relation: 'Son', age: 18, phone: '' },
        { name: 'Neha Sharma', relation: 'Daughter', age: 14, phone: '' }
      ],
      travelMode: 'self',
      travelType: 'rail',
      boardingStation: 'Mumbai Central',
      droppingStation: 'Mathura',
      remarks: 'First yatra with us.'
    },
    {
      id: 'devotee_9123456789',
      cleanPhone: '9123456789',
      phone: '9123456789',
      name: 'Aditi Patel',
      email: 'aditi.patel@yahoo.com',
      location: 'Ahmedabad',
      type: 'individual',
      familyName: '',
      membersCount: 1,
      familyMembers: [
        { name: 'Aditi Patel', relation: 'Self', age: 28, phone: '9123456789' }
      ],
      travelMode: 'organised',
      travelType: '',
      boardingStation: '',
      droppingStation: '',
      remarks: 'Active volunteer.'
    },
    {
      id: 'devotee_8765432109',
      cleanPhone: '8765432109',
      phone: '8765432109',
      name: 'Sanjay Gupta',
      email: 'sanjay.g@rediff.com',
      location: 'Delhi',
      type: 'family',
      familyName: 'Gupta Family',
      membersCount: 3,
      familyMembers: [
        { name: 'Sanjay Gupta', relation: 'Self', age: 50, phone: '8765432109' },
        { name: 'Rekha Gupta', relation: 'Spouse', age: 46, phone: '' },
        { name: 'Divya Gupta', relation: 'Daughter', age: 21, phone: '' }
      ],
      travelMode: 'self',
      travelType: 'road',
      boardingStation: '',
      droppingStation: '',
      remarks: 'Interested in registration.'
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
  ],
  buses: [
    {
      id: 'bus_1',
      yatraId: 'yatra_vrindavan_2026',
      name: 'Bus 1 (AC Video Coach)',
      busNumber: 'MH 02 AB 1234',
      route: 'Mumbai Central -> Dadar -> Mathura/Vrindavan',
      capacity: 35,
      coordinatorName: 'Syamasundara Das',
      coordinatorPhone: '9812345678',
      driverName: 'Raju Bhai',
      driverPhone: '9898765432',
      departureTime: '06:00 AM (Day 1)',
      boardingPoint: 'Platform 1 Main Gate, Mumbai Central',
      status: 'active'
    },
    {
      id: 'bus_2',
      yatraId: 'yatra_vrindavan_2026',
      name: 'Bus 2 (Deluxe AC Sleeper)',
      busNumber: 'MH 02 CD 5678',
      route: 'Borivali -> Thane -> Mathura/Vrindavan',
      capacity: 30,
      coordinatorName: 'Krishna Das',
      coordinatorPhone: '9999988888',
      driverName: 'Mohan Sharma',
      driverPhone: '9811122233',
      departureTime: '06:30 AM (Day 1)',
      boardingPoint: 'Near Borivali National Park Flyover',
      status: 'active'
    },
    {
      id: 'bus_3',
      yatraId: 'yatra_vrindavan_2026',
      name: 'Bus 3 (AC Semi-Sleeper)',
      busNumber: 'MH 04 EF 9012',
      route: 'Pune -> Navi Mumbai -> Vrindavan',
      capacity: 36,
      coordinatorName: 'Rohit Wadhwani',
      coordinatorPhone: '9876543210',
      driverName: 'Devendra Yadav',
      driverPhone: '9822233344',
      departureTime: '05:30 AM (Day 1)',
      boardingPoint: 'Vashi Plaza, Navi Mumbai',
      status: 'active'
    },
    {
      id: 'bus_4',
      yatraId: 'yatra_vrindavan_2026',
      name: 'Bus 4 (Express Coach)',
      busNumber: 'DL 01 XY 3456',
      route: 'Delhi Airport/Station -> Vrindavan Direct',
      capacity: 42,
      coordinatorName: 'Gauranga Das',
      coordinatorPhone: '9898989898',
      driverName: 'Suresh Kumar',
      driverPhone: '9833344455',
      departureTime: '08:00 AM (Day 1)',
      boardingPoint: 'New Delhi Railway Station Paharganj Side',
      status: 'active'
    }
  ],
  rooms: [
    { id: 'rm_101', yatraId: 'yatra_vrindavan_2026', hotelId: 'h1', hotelName: 'MVT Guesthouse', roomNumber: '101', roomType: 'Double Bed', capacity: 2, floor: 'Ground Floor', extraMattressCost: 500 },
    { id: 'rm_102', yatraId: 'yatra_vrindavan_2026', hotelId: 'h1', hotelName: 'MVT Guesthouse', roomNumber: '102', roomType: 'Double Bed', capacity: 2, floor: 'Ground Floor', extraMattressCost: 500 },
    { id: 'rm_103', yatraId: 'yatra_vrindavan_2026', hotelId: 'h1', hotelName: 'MVT Guesthouse', roomNumber: '103', roomType: 'Triple Bed', capacity: 3, floor: 'Ground Floor', extraMattressCost: 500 },
    { id: 'rm_201', yatraId: 'yatra_vrindavan_2026', hotelId: 'h1', hotelName: 'MVT Guesthouse', roomNumber: '201', roomType: 'Family Suite', capacity: 4, floor: '1st Floor', extraMattressCost: 500 },
    { id: 'rm_202', yatraId: 'yatra_vrindavan_2026', hotelId: 'h1', hotelName: 'MVT Guesthouse', roomNumber: '202', roomType: 'Family Suite', capacity: 4, floor: '1st Floor', extraMattressCost: 500 },
    { id: 'rm_203', yatraId: 'yatra_vrindavan_2026', hotelId: 'h1', hotelName: 'MVT Guesthouse', roomNumber: '203', roomType: 'Triple Bed', capacity: 3, floor: '1st Floor', extraMattressCost: 500 },
    { id: 'rm_204', yatraId: 'yatra_vrindavan_2026', hotelId: 'h1', hotelName: 'MVT Guesthouse', roomNumber: '204', roomType: 'Double Bed', capacity: 2, floor: '1st Floor', extraMattressCost: 500 },
    { id: 'rm_205', yatraId: 'yatra_vrindavan_2026', hotelId: 'h1', hotelName: 'MVT Guesthouse', roomNumber: '205', roomType: 'Double Bed', capacity: 2, floor: '1st Floor', extraMattressCost: 500 },
    { id: 'rm_kb_101', yatraId: 'yatra_vrindavan_2026', hotelId: 'h2', hotelName: 'Krishna Balaram Residency', roomNumber: '101', roomType: 'Double Bed', capacity: 2, floor: 'Ground Floor', extraMattressCost: 400 },
    { id: 'rm_kb_102', yatraId: 'yatra_vrindavan_2026', hotelId: 'h2', hotelName: 'Krishna Balaram Residency', roomNumber: '102', roomType: 'Double Bed', capacity: 2, floor: 'Ground Floor', extraMattressCost: 400 },
    { id: 'rm_kb_201', yatraId: 'yatra_vrindavan_2026', hotelId: 'h2', hotelName: 'Krishna Balaram Residency', roomNumber: '201', roomType: 'Triple Bed', capacity: 3, floor: '1st Floor', extraMattressCost: 400 },
    { id: 'rm_kb_202', yatraId: 'yatra_vrindavan_2026', hotelId: 'h2', hotelName: 'Krishna Balaram Residency', roomNumber: '202', roomType: 'Family Suite', capacity: 4, floor: '1st Floor', extraMattressCost: 400 }
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

  // --- Devotee Profiles Retention Methods ---
  async getDevoteeProfiles() {
    return this.getCollection('devotee_profiles');
  }

  async saveDevoteeProfile(profile) {
    if (!profile || !profile.phone) return null;
    const cleanPhone = profile.phone.replace(/[^0-9]/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length < 10) return null;

    const profileData = {
      id: `devotee_${cleanPhone}`,
      phone: profile.phone,
      cleanPhone: cleanPhone,
      name: profile.name || '',
      email: profile.email || '',
      location: profile.location || '',
      type: profile.type || 'individual',
      familyName: profile.familyName || '',
      membersCount: profile.membersCount || (profile.familyMembers ? profile.familyMembers.length : 1),
      familyMembers: profile.familyMembers || [],
      travelMode: profile.travelMode || 'organised',
      travelType: profile.travelType || '',
      boardingStation: profile.boardingStation || '',
      droppingStation: profile.droppingStation || '',
      remarks: profile.remarks || '',
      updatedAt: new Date().toISOString()
    };

    return this.setDocument('devotee_profiles', profileData.id, profileData);
  }

  async findDevoteeByPhone(phone) {
    if (!phone) return null;
    const clean = phone.replace(/[^0-9]/g, '').slice(-10);
    if (!clean || clean.length < 10) return null;

    // 1. First check explicit devotee_profiles
    const profiles = await this.getCollection('devotee_profiles');
    const existing = profiles.find(p => {
      const pClean = (p.cleanPhone || p.phone || '').replace(/[^0-9]/g, '').slice(-10);
      return pClean === clean;
    });
    if (existing) return existing;

    // 2. Fallback: Search all participants across any past Yatras
    const participants = await this.getCollection('participants');
    const matching = participants.filter(p => {
      const pClean = (p.phone || '').replace(/[^0-9]/g, '').slice(-10);
      return pClean === clean;
    });

    if (matching.length > 0) {
      // Pick the most complete record (prefer ones with familyMembers)
      const best = [...matching].sort((a, b) => {
        const aCount = (a.familyMembers && a.familyMembers.length) || 0;
        const bCount = (b.familyMembers && b.familyMembers.length) || 0;
        return bCount - aCount;
      })[0];

      return {
        id: `devotee_${clean}`,
        phone: best.phone,
        cleanPhone: clean,
        name: best.name || '',
        email: best.email || '',
        location: best.location || '',
        type: best.type || (best.familyMembers && best.familyMembers.length > 1 ? 'family' : 'individual'),
        familyName: best.familyName || '',
        membersCount: best.membersCount || (best.familyMembers ? best.familyMembers.length : 1),
        familyMembers: best.familyMembers || [],
        travelMode: best.travelMode || 'organised',
        travelType: best.travelType || '',
        boardingStation: best.boardingStation || '',
        droppingStation: best.droppingStation || '',
        remarks: best.remarks || ''
      };
    }

    return null;
  }

  // --- Bus Logistics Methods ---
  async getBuses(yatraId) {
    const all = await this.getCollection('buses');
    return all.filter(b => b.yatraId === yatraId);
  }
  async addBus(bus) { return this.addDocument('buses', bus); }
  async updateBus(id, updates) { return this.updateDocument('buses', id, updates); }
  async deleteBus(id) { return this.deleteDocument('buses', id); }

  // --- Hotel Room Logistics Methods ---
  async getRooms(yatraId) {
    const all = await this.getCollection('rooms');
    return all.filter(r => r.yatraId === yatraId);
  }
  async addRoom(room) { return this.addDocument('rooms', room); }
  async updateRoom(id, updates) { return this.updateDocument('rooms', id, updates); }
  async deleteRoom(id) { return this.deleteDocument('rooms', id); }

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
