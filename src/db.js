import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, addDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';

// Default Demo Data to populate when db is empty
const DEMO_DATA = {
  users: [
    { id: 'super_admin_1', email: 'rohit.wadhwani83@gmail.com', role: 'super_admin', name: 'Rohit Wadhwani', phone: '+919876543210', password: 'admin123', mustChangePassword: false },
    { id: 'admin_1', email: 'admin@yatra.com', role: 'admin', name: 'Krishna Das', phone: '+919999988888', password: 'admin123', mustChangePassword: false }
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
      paymentStatus: 'completed',
      registeredAt: '2026-10-01T09:00:00.000Z',
      createdAt: '2026-10-01T09:00:00.000Z'
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
      paymentStatus: 'completed',
      registeredAt: '2026-10-01T14:30:00.000Z',
      createdAt: '2026-10-01T14:30:00.000Z'
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
      paymentStatus: 'pending',
      registeredAt: '2026-10-02T10:15:00.000Z',
      createdAt: '2026-10-02T10:15:00.000Z'
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
      paymentStatus: 'completed',
      registeredAt: '2026-10-02T16:45:00.000Z',
      createdAt: '2026-10-02T16:45:00.000Z'
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
      paymentStatus: 'completed',
      registeredAt: '2026-10-03T11:20:00.000Z',
      createdAt: '2026-10-03T11:20:00.000Z'
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
      paymentStatus: 'completed',
      registeredAt: '2026-10-03T17:10:00.000Z',
      createdAt: '2026-10-03T17:10:00.000Z'
    },
    {
      id: 'p7',
      yatraId: 'yatra_vrindavan_2026',
      name: 'Rajesh Bansal',
      phone: '9810055443',
      email: 'rajesh.bansal@gmail.com',
      location: 'Delhi',
      type: 'family',
      familyName: 'Bansal Family',
      membersCount: 5,
      familyMembers: [
        { name: 'Rajesh Bansal', relation: 'Self', age: 52, phone: '9810055443' },
        { name: 'Meenakshi Bansal', relation: 'Spouse', age: 48, phone: '' },
        { name: 'Rohan Bansal', relation: 'Son', age: 22, phone: '' },
        { name: 'Pooja Bansal', relation: 'Daughter', age: 19, phone: '' },
        { name: 'Shanti Devi Bansal', relation: 'Mother', age: 74, phone: '' }
      ],
      memberDetails: 'Rajesh (52), Meenakshi (48), Rohan (22), Pooja (19), Shanti Devi (74)',
      travelMode: 'organised',
      travelType: '',
      boardingStation: '',
      droppingStation: '',
      remarks: 'Requires ground floor for elderly mother. Family of 5.',
      status: 'confirmed',
      paymentStatus: 'completed',
      registeredAt: '2026-10-04T12:00:00.000Z',
      createdAt: '2026-10-04T12:00:00.000Z'
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
    { id: 'rm_101', yatraId: 'yatra_vrindavan_2026', hotelId: 'h1', hotelName: 'MVT Guesthouse', roomNumber: '101', roomType: 'Twin Bed', bedCount: 2, capacity: 2, floor: 'Ground Floor', extraMattressCost: 500, extraMattressAllowed: 0 },
    { id: 'rm_102', yatraId: 'yatra_vrindavan_2026', hotelId: 'h1', hotelName: 'MVT Guesthouse', roomNumber: '102', roomType: 'Twin Bed', bedCount: 2, capacity: 2, floor: 'Ground Floor', extraMattressCost: 500, extraMattressAllowed: 0 },
    { id: 'rm_103', yatraId: 'yatra_vrindavan_2026', hotelId: 'h1', hotelName: 'MVT Guesthouse', roomNumber: '103', roomType: 'Triple Bed', bedCount: 3, capacity: 3, floor: 'Ground Floor', extraMattressCost: 500, extraMattressAllowed: 1 },
    { id: 'rm_201', yatraId: 'yatra_vrindavan_2026', hotelId: 'h1', hotelName: 'MVT Guesthouse', roomNumber: '201', roomType: '5-Bedded Family Suite', bedCount: 5, capacity: 5, floor: '1st Floor', extraMattressCost: 500, extraMattressAllowed: 1 },
    { id: 'rm_202', yatraId: 'yatra_vrindavan_2026', hotelId: 'h1', hotelName: 'MVT Guesthouse', roomNumber: '202', roomType: 'Quad Bed (4 Beds)', bedCount: 4, capacity: 4, floor: '1st Floor', extraMattressCost: 500, extraMattressAllowed: 0 },
    { id: 'rm_203', yatraId: 'yatra_vrindavan_2026', hotelId: 'h1', hotelName: 'MVT Guesthouse', roomNumber: '203', roomType: 'Triple Bed', bedCount: 3, capacity: 3, floor: '1st Floor', extraMattressCost: 500, extraMattressAllowed: 0 },
    { id: 'rm_204', yatraId: 'yatra_vrindavan_2026', hotelId: 'h1', hotelName: 'MVT Guesthouse', roomNumber: '204', roomType: 'Twin Bed', bedCount: 2, capacity: 2, floor: '1st Floor', extraMattressCost: 500, extraMattressAllowed: 0 },
    { id: 'rm_205', yatraId: 'yatra_vrindavan_2026', hotelId: 'h1', hotelName: 'MVT Guesthouse', roomNumber: '205', roomType: 'Twin Bed', bedCount: 2, capacity: 2, floor: '1st Floor', extraMattressCost: 500, extraMattressAllowed: 0 },
    { id: 'rm_kb_101', yatraId: 'yatra_vrindavan_2026', hotelId: 'h2', hotelName: 'Krishna Balaram Residency', roomNumber: '101', roomType: 'Twin Bed', bedCount: 2, capacity: 2, floor: 'Ground Floor', extraMattressCost: 400, extraMattressAllowed: 0 },
    { id: 'rm_kb_102', yatraId: 'yatra_vrindavan_2026', hotelId: 'h2', hotelName: 'Krishna Balaram Residency', roomNumber: '102', roomType: 'Twin Bed', bedCount: 2, capacity: 2, floor: 'Ground Floor', extraMattressCost: 400, extraMattressAllowed: 0 },
    { id: 'rm_kb_201', yatraId: 'yatra_vrindavan_2026', hotelId: 'h2', hotelName: 'Krishna Balaram Residency', roomNumber: '201', roomType: 'Triple Bed', bedCount: 3, capacity: 3, floor: '1st Floor', extraMattressCost: 400, extraMattressAllowed: 0 },
    { id: 'rm_kb_202', yatraId: 'yatra_vrindavan_2026', hotelId: 'h2', hotelName: 'Krishna Balaram Residency', roomNumber: '202', roomType: '5-Bedded Family Suite', bedCount: 5, capacity: 5, floor: '1st Floor', extraMattressCost: 400, extraMattressAllowed: 1 }
  ]
};

// Database helper using LocalStorage with Firebase support
class Database {
  constructor() {
    this.firebaseApp = null;
    this.firestore = null;
    this.isFirebaseReady = false;

    // 1. Try to load Firebase Config from Vite Environment Variables (shared across all devices on Vercel)
    let envConfig = null;
    try {
      if (typeof import.meta !== 'undefined' && import.meta.env) {
        if (import.meta.env.VITE_FIREBASE_CONFIG) {
          envConfig = typeof import.meta.env.VITE_FIREBASE_CONFIG === 'string'
            ? JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG)
            : import.meta.env.VITE_FIREBASE_CONFIG;
        } else if (import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_PROJECT_ID) {
          envConfig = {
            apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
            authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
            projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
            storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
            messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
            appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
          };
        }
      }
    } catch (e) {
      console.warn("Could not load Firebase config from env:", e);
    }

    if (envConfig) {
      this.initializeFirebase(envConfig);
    } else {
      // 2. Fall back to saved Firebase Config in LocalStorage
      const savedConfig = localStorage.getItem('yatra_firebase_config');
      if (savedConfig) {
        try {
          const config = JSON.parse(savedConfig);
          this.initializeFirebase(config);
        } catch (e) {
          console.error("Failed to parse saved Firebase config", e);
        }
      } else {
        // 3. Fall back to Default Built-in Firebase Project for automatic live sync
        try {
          const defaultCfg = {
            apiKey: "AIzaSyC-zhJTaLdW50CG2q-LkmVMJqZzJCnRkGk",
            authDomain: "yatra-manager.firebaseapp.com",
            projectId: "yatra-manager",
            storageBucket: "yatra-manager.appspot.com",
            messagingSenderId: "659618219652",
            appId: "1:659618219652:web:cb6bd0760d53400c6fe4d1",
            measurementId: "G-VHSY9QDKET"
          };
          this.initializeFirebase(defaultCfg);
        } catch (e) {
          console.warn("Could not load default Firebase config:", e);
        }
      }
    }

    // Initialize LocalStorage with Demo Data if completely empty
    this.initLocalStorageDemo();
  }

  initLocalStorageDemo() {
    const deletedPhotos = new Set(JSON.parse(localStorage.getItem('yatra_mgr_deleted_photos') || '[]'));
    Object.keys(DEMO_DATA).forEach(key => {
      const storageKey = `yatra_mgr_${key}`;
      if (!localStorage.getItem(storageKey)) {
        let initialData = DEMO_DATA[key];
        if (key === 'photos') {
          initialData = initialData.filter(ph => !deletedPhotos.has(ph.id));
        }
        localStorage.setItem(storageKey, JSON.stringify(initialData));
      }
    });

    // Auto-migration: ensure existing room records have bedCount, and include p7 if missing
    try {
      const roomsRaw = localStorage.getItem('yatra_mgr_rooms');
      if (roomsRaw) {
        const parsed = JSON.parse(roomsRaw);
        let changed = false;
        parsed.forEach(r => {
          if (!r.bedCount) {
            r.bedCount = parseInt(r.capacity) || 2;
            changed = true;
          }
          if (r.extraMattressAllowed === undefined) {
            r.extraMattressAllowed = 0;
            changed = true;
          }
        });
        // Check if demo 5-bedded suite exists in MVT
        if (!parsed.some(r => r.bedCount >= 5)) {
          parsed.push({ id: 'rm_201', yatraId: 'yatra_vrindavan_2026', hotelId: 'h1', hotelName: 'MVT Guesthouse', roomNumber: '201', roomType: '5-Bedded Family Suite', bedCount: 5, capacity: 5, floor: '1st Floor', extraMattressCost: 500, extraMattressAllowed: 1 });
          changed = true;
        }
        if (changed) {
          localStorage.setItem('yatra_mgr_rooms', JSON.stringify(parsed));
        }
      }
      const partsRaw = localStorage.getItem('yatra_mgr_participants');
      if (partsRaw) {
        const parts = JSON.parse(partsRaw);
        let pChanged = false;
        if (!parts.some(p => p.id === 'p7')) {
          const p7 = DEMO_DATA.participants.find(p => p.id === 'p7');
          if (p7) {
            parts.push(p7);
            pChanged = true;
          }
        }
        // Ensure every participant has a registeredAt & createdAt timestamp
        parts.forEach((p, idx) => {
          if (!p.registeredAt && !p.createdAt) {
            // Sequential virtual baseline spaced by hours based on order
            const baseDate = new Date(1700000000000 + (idx + 1) * 86400000);
            p.registeredAt = baseDate.toISOString();
            p.createdAt = baseDate.toISOString();
            pChanged = true;
          }
        });
        if (pChanged) {
          localStorage.setItem('yatra_mgr_participants', JSON.stringify(parts));
        }
      }

      // Ensure user records have password & mustChangePassword
      const usersRaw = localStorage.getItem('yatra_mgr_users');
      if (usersRaw) {
        const users = JSON.parse(usersRaw);
        let uChanged = false;
        users.forEach(u => {
          if (!u.password) {
            u.password = 'admin123';
            uChanged = true;
          }
          if (u.mustChangePassword === undefined) {
            u.mustChangePassword = false;
            uChanged = true;
          }
        });
        if (uChanged) {
          localStorage.setItem('yatra_mgr_users', JSON.stringify(users));
        }
      }
    } catch (e) {
      console.warn("Storage migration notice", e);
    }
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
    const deletedRegistryKey = `yatra_mgr_deleted_${collectionName}`;
    const localDeletedIds = new Set(JSON.parse(localStorage.getItem(deletedRegistryKey) || '[]'));

    if (this.isFirebaseReady) {
      try {
        // Sync tombstones from Firestore
        try {
          const tombstonesSnap = await getDocs(collection(this.firestore, `deleted_${collectionName}`));
          tombstonesSnap.forEach(d => localDeletedIds.add(d.id));
          localStorage.setItem(deletedRegistryKey, JSON.stringify(Array.from(localDeletedIds)));
        } catch (tErr) {}

        const querySnapshot = await getDocs(collection(this.firestore, collectionName));
        const list = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.isDeleted || localDeletedIds.has(doc.id)) {
            // Document was marked deleted! Record it locally and omit from active list
            localDeletedIds.add(doc.id);
          } else {
            list.push({ id: doc.id, ...data });
          }
        });

        // Safe auto-sync: Only sync items that are NOT in localDeletedIds and NOT marked deleted
        try {
          const localItems = JSON.parse(localStorage.getItem(`yatra_mgr_${collectionName}`) || '[]');
          const remoteIds = new Set(list.map(item => item.id));
          for (const localItem of localItems) {
            if (localItem && localItem.id) {
              if (localDeletedIds.has(localItem.id) || localItem.isDeleted) {
                // Item is deleted! Never re-upload to Firestore
                continue;
              }
              if (!remoteIds.has(localItem.id)) {
                const docRef = doc(this.firestore, collectionName, localItem.id);
                await setDoc(docRef, localItem, { merge: true });
                list.push(localItem);
                remoteIds.add(localItem.id);
              }
            }
          }
        } catch (mergeErr) {
          console.warn("Local sync merge notice:", mergeErr);
        }

        // Clean local cache so deleted items are completely purged
        const cleanedList = list.filter(item => !localDeletedIds.has(item.id) && !item.isDeleted);
        try {
          localStorage.setItem(`yatra_mgr_${collectionName}`, JSON.stringify(cleanedList));
          localStorage.setItem(deletedRegistryKey, JSON.stringify(Array.from(localDeletedIds)));
        } catch (e) {}

        return cleanedList;
      } catch (err) {
        console.warn("Firestore read failed, falling back to LocalStorage:", err);
      }
    }
    const localList = JSON.parse(localStorage.getItem(`yatra_mgr_${collectionName}`) || '[]');
    return localList.filter(item => !localDeletedIds.has(item.id) && !item.isDeleted);
  }

  async setDocument(collectionName, id, data) {
    if (this.isFirebaseReady) {
      try {
        const docRef = doc(this.firestore, collectionName, id);
        await setDoc(docRef, data, { merge: true });
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
    const nowIso = new Date().toISOString();
    const newItem = { 
      createdAt: nowIso,
      registeredAt: nowIso,
      ...data, 
      id 
    };
    if (this.isFirebaseReady) {
      try {
        const docRef = doc(this.firestore, collectionName, id);
        await setDoc(docRef, newItem);
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
    let result = null;
    if (this.isFirebaseReady) {
      try {
        const docRef = doc(this.firestore, collectionName, id);
        await updateDoc(docRef, updates);
        const updatedDoc = await getDoc(docRef);
        result = { id, ...updatedDoc.data() };
      } catch (err) {
        console.warn("Firestore update failed, falling back to LocalStorage:", err);
      }
    }
    const list = JSON.parse(localStorage.getItem(`yatra_mgr_${collectionName}`) || '[]');
    const index = list.findIndex(item => item.id === id);
    if (index >= 0) {
      list[index] = { ...list[index], ...updates };
      localStorage.setItem(`yatra_mgr_${collectionName}`, JSON.stringify(list));
      if (!result) result = list[index];
    } else if (result) {
      list.push(result);
      localStorage.setItem(`yatra_mgr_${collectionName}`, JSON.stringify(list));
    }
    if (result) return result;
    throw new Error(`Document with id ${id} not found in ${collectionName}`);
  }

  async deleteDocument(collectionName, id) {
    const deletedRegistryKey = `yatra_mgr_deleted_${collectionName}`;
    const deletedIds = new Set(JSON.parse(localStorage.getItem(deletedRegistryKey) || '[]'));
    deletedIds.add(id);
    localStorage.setItem(deletedRegistryKey, JSON.stringify(Array.from(deletedIds)));

    if (this.isFirebaseReady) {
      try {
        const docRef = doc(this.firestore, collectionName, id);
        // 1. Mark as tombstone in Firestore so all other syncing clients know it was deleted
        await setDoc(docRef, { isDeleted: true, deletedAt: new Date().toISOString() }, { merge: true });
        // 2. Also register in deleted_records collection
        try {
          const tombstoneRef = doc(this.firestore, `deleted_${collectionName}`, id);
          await setDoc(tombstoneRef, { id, deletedAt: new Date().toISOString() });
        } catch (tErr) {}
        // 3. Attempt physical delete
        try {
          await deleteDoc(docRef);
        } catch (delErr) {
          console.warn("deleteDoc notice:", delErr);
        }
      } catch (err) {
        console.warn("Firestore delete failed, falling back to LocalStorage:", err);
      }
    }
    const list = JSON.parse(localStorage.getItem(`yatra_mgr_${collectionName}`) || '[]');
    const filtered = list.filter(item => item.id !== id && !item.isDeleted);
    localStorage.setItem(`yatra_mgr_${collectionName}`, JSON.stringify(filtered));
    return true;
  }

  // --- Specific API Wrappers ---
  async getUsers() { return this.getCollection('users'); }
  async addUser(user) { return this.addDocument('users', user); }
  async updateUser(id, updates) { return this.updateDocument('users', id, updates); }
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
    const filtered = all.filter(p => p.yatraId === yatraId);
    return filtered.sort((a, b) => {
      const getTs = (p) => {
        if (!p) return 0;
        const d = p.registeredAt || p.createdAt || p.registeredDate;
        if (d) {
          if (typeof d === 'number') return d;
          if (d.toMillis && typeof d.toMillis === 'function') return d.toMillis();
          if (d.seconds) return d.seconds * 1000;
          const t = new Date(d).getTime();
          if (!isNaN(t) && t > 0) return t;
        }
        if (p.id && typeof p.id === 'string') {
          const m = p.id.match(/\d{10,13}/);
          if (m) {
            const ts = parseInt(m[0], 10);
            if (ts > 1000000000) return ts > 1000000000000 ? ts : ts * 1000;
          }
          const seq = p.id.match(/^p(\d+)$/i);
          if (seq) return 1700000000000 + parseInt(seq[1], 10) * 86400000;
        }
        return 0;
      };
      return getTs(b) - getTs(a);
    });
  }
  async addParticipant(participant) { 
    const nowIso = new Date().toISOString();
    const withTimestamps = {
      ...participant,
      registeredAt: participant.registeredAt || participant.createdAt || nowIso,
      createdAt: participant.createdAt || participant.registeredAt || nowIso
    };
    return this.addDocument('participants', withTimestamps); 
  }
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
    const deletedRegistryKey = `yatra_mgr_deleted_photos`;
    const deletedIds = new Set(JSON.parse(localStorage.getItem(deletedRegistryKey) || '[]'));
    return all.filter(ph => ph.yatraId === yatraId && !ph.isDeleted && !deletedIds.has(ph.id));
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

  // Complete Database Backup (JSON)
  async getFullBackup() {
    const backup = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      collections: {}
    };
    const collectionKeys = ['yatras', 'hotels', 'rooms', 'buses', 'participants', 'expenses', 'payments', 'photos', 'users', 'devotee_profiles'];
    for (const key of collectionKeys) {
      backup.collections[key] = await this.getCollection(key);
    }
    return backup;
  }

  // Restore Complete Database Backup (JSON)
  async restoreFullBackup(backupData) {
    if (!backupData || !backupData.collections) {
      throw new Error('Invalid backup file format.');
    }
    for (const [key, items] of Object.entries(backupData.collections)) {
      if (Array.isArray(items)) {
        localStorage.setItem(`yatra_mgr_${key}`, JSON.stringify(items));
        if (this.isFirebaseReady) {
          for (const item of items) {
            if (item.id) {
              await this.setDocument(key, item.id, item);
            }
          }
        }
      }
    }
    return true;
  }

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
