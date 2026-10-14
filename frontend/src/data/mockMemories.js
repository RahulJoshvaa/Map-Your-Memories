/**
 * Mock Memory Pins Data Layer
 * 
 * Provides mock memories with accurate geographic coordinates for:
 * - Ooty (Multiple memories at the same location to demonstrate clustering/overlap handling)
 * - Chennai
 * - Coimbatore
 * - Bangalore
 * - Madurai
 * - Palolem, Goa
 * - Kodaikanal
 * 
 * Each record implements the required schema:
 * {
 *   id,
 *   title,
 *   description,
 *   latitude,
 *   longitude,
 *   date,
 *   accessType, // "owner" | "shared"
 *   permission, // "OWNER" | "EDITOR" | "VIEWER"
 *   mediaCount: { photos, videos }
 * }
 * 
 * Ready to be swapped with FastAPI endpoints: GET /pins, POST /pins, etc.
 */

export const INITIAL_MEMORIES = [
  // --- Ooty Cluster: 3 memories at identical/overlapping coordinates ---
  {
    id: 'mem-ooty-1',
    title: 'Ooty College Trip',
    description: 'Chilly morning stroll through Government Botanical Garden and chocolate shopping with batchmates.',
    latitude: 11.4102,
    longitude: 76.6950,
    locationName: 'Ooty, Tamil Nadu',
    date: '2026-08-15',
    accessType: 'owner',
    permission: 'OWNER',
    isFavorite: true,
    lastAccessed: '12 minutes ago',
    owner: {
      id: 'usr-1',
      name: 'Rahul Verma',
      avatar: '👨‍💻',
      email: 'rahul@memories.map',
    },
    mediaCount: {
      photos: 12,
      videos: 2,
    },
    tags: ['College', 'Hill Station', 'Friends', 'Nilgiris'],
    color: '#ffb72b',
    category: 'Adventure',
  },
  {
    id: 'mem-ooty-2',
    title: 'Family Nilgiri Holiday',
    description: 'Heritage steam toy train ride from Mettupalayam, Doddabetta Peak sunrise, and piping hot homemade tea.',
    latitude: 11.4102,
    longitude: 76.6950,
    locationName: 'Ooty, Tamil Nadu',
    date: '2026-05-20',
    accessType: 'owner',
    permission: 'OWNER',
    isFavorite: true,
    lastAccessed: '2 days ago',
    owner: {
      id: 'usr-1',
      name: 'Rahul Verma',
      avatar: '👨‍💻',
      email: 'rahul@memories.map',
    },
    mediaCount: {
      photos: 28,
      videos: 4,
    },
    tags: ['Family', 'Toy Train', 'Mountains', 'Sunrise'],
    color: '#02a896',
    category: 'Vacation',
  },
  {
    id: 'mem-ooty-3',
    title: 'Tea Estate Photography Trek',
    description: 'Golden hour drone shots above stepped emerald tea hills and private tea tasting session.',
    latitude: 11.4102,
    longitude: 76.6950,
    locationName: 'Ooty, Tamil Nadu',
    date: '2026-03-12',
    accessType: 'shared',
    permission: 'EDITOR',
    isFavorite: false,
    lastAccessed: '1 week ago',
    owner: {
      id: 'usr-2',
      name: 'Arjun Nair',
      avatar: '📸',
      email: 'arjun@travel.io',
    },
    mediaCount: {
      photos: 35,
      videos: 6,
    },
    tags: ['Photography', 'Tea', 'Trek', 'Drone'],
    color: '#ff6b6b',
    category: 'Creative',
  },

  // --- Chennai ---
  {
    id: 'mem-chennai-1',
    title: 'Marina Beach Kite Festival',
    description: 'Breezy Pongal evening watching giant colorful kites over the Bay of Bengal, eating roasted corn and sundal.',
    latitude: 13.0827,
    longitude: 80.2707,
    locationName: 'Marina Beach, Chennai',
    date: '2026-01-14',
    accessType: 'owner',
    permission: 'OWNER',
    isFavorite: true,
    lastAccessed: '3 hours ago',
    owner: {
      id: 'usr-1',
      name: 'Rahul Verma',
      avatar: '👨‍💻',
      email: 'rahul@memories.map',
    },
    mediaCount: {
      photos: 18,
      videos: 3,
    },
    tags: ['Beach', 'Festival', 'Chennai', 'Food'],
    color: '#ffb72b',
    category: 'Culture',
  },
  {
    id: 'mem-chennai-2',
    title: 'ECR Shore Temple Drive',
    description: 'Coastal cruising along East Coast Road, visiting 8th-century shore temples and beachside cafe stop.',
    latitude: 12.6208,
    longitude: 80.1944,
    locationName: 'Mahabalipuram, ECR',
    date: '2026-07-04',
    accessType: 'shared',
    permission: 'VIEWER',
    isFavorite: false,
    lastAccessed: '4 days ago',
    owner: {
      id: 'usr-3',
      name: 'Priya Sharma',
      avatar: '🎨',
      email: 'priya@studio.design',
    },
    mediaCount: {
      photos: 14,
      videos: 1,
    },
    tags: ['Road Trip', 'Heritage', 'Sea', 'Cafe'],
    color: '#38bdf8',
    category: 'Road Trip',
  },

  // --- Coimbatore ---
  {
    id: 'mem-coimbatore-1',
    title: 'Western Ghats Foothills Run',
    description: 'Crisp morning jog near Marudhamalai temple foothills followed by authentic south Indian filter coffee.',
    latitude: 11.0168,
    longitude: 76.9558,
    locationName: 'Coimbatore, Tamil Nadu',
    date: '2026-06-18',
    accessType: 'owner',
    permission: 'OWNER',
    isFavorite: false,
    lastAccessed: 'Yesterday',
    owner: {
      id: 'usr-1',
      name: 'Rahul Verma',
      avatar: '👨‍💻',
      email: 'rahul@memories.map',
    },
    mediaCount: {
      photos: 9,
      videos: 2,
    },
    tags: ['Morning', 'Western Ghats', 'Coffee', 'Nature'],
    color: '#02a896',
    category: 'Fitness',
  },

  // --- Bangalore ---
  {
    id: 'mem-bangalore-1',
    title: 'Cubbon Park Acoustic Jam',
    description: 'Sunday morning acoustic guitar jam under ancient bamboo groves, puppy watching, and cold brew hopping.',
    latitude: 12.9716,
    longitude: 77.5946,
    locationName: 'Cubbon Park, Bangalore',
    date: '2026-09-10',
    accessType: 'shared',
    permission: 'EDITOR',
    isFavorite: true,
    lastAccessed: 'Just now',
    owner: {
      id: 'usr-4',
      name: 'Ananya Roy',
      avatar: '🎸',
      email: 'ananya@soundscapes.co',
    },
    mediaCount: {
      photos: 31,
      videos: 7,
    },
    tags: ['Music', 'Park', 'Bangalore', 'Coffee'],
    color: '#a855f7',
    category: 'Music',
  },
  {
    id: 'mem-bangalore-2',
    title: 'Indiranagar Rooftop Launch',
    description: 'Celebrated the new product launch milestone under fairy lights with tech friends and great conversation.',
    latitude: 12.9784,
    longitude: 77.6408,
    locationName: 'Indiranagar, Bangalore',
    date: '2026-08-28',
    accessType: 'owner',
    permission: 'OWNER',
    isFavorite: false,
    lastAccessed: '5 days ago',
    owner: {
      id: 'usr-1',
      name: 'Rahul Verma',
      avatar: '👨‍💻',
      email: 'rahul@memories.map',
    },
    mediaCount: {
      photos: 16,
      videos: 4,
    },
    tags: ['Startup', 'Nightlife', 'Celebration'],
    color: '#ffb72b',
    category: 'Social',
  },

  // --- Madurai ---
  {
    id: 'mem-madurai-1',
    title: 'Meenakshi Temple Night Illumination',
    description: 'Marveling at the intricate thousand-pillar hall sculpture work, sweet jasmine garlands, and ice-cold Famous Jigarthanda.',
    latitude: 9.9252,
    longitude: 78.1198,
    locationName: 'Madurai, Tamil Nadu',
    date: '2026-04-05',
    accessType: 'owner',
    permission: 'OWNER',
    isFavorite: true,
    lastAccessed: '2 weeks ago',
    owner: {
      id: 'usr-1',
      name: 'Rahul Verma',
      avatar: '👨‍💻',
      email: 'rahul@memories.map',
    },
    mediaCount: {
      photos: 24,
      videos: 3,
    },
    tags: ['Heritage', 'Architecture', 'Food', 'Culture'],
    color: '#f97316',
    category: 'Culture',
  },

  // --- Goa (as in user spec) ---
  {
    id: 'mem-goa-1',
    title: 'Goa Coastal Villa Escape',
    description: 'South Goa secluded cove swimming, seaside sunset shacks, and scooter expeditions through coconut groves.',
    latitude: 15.2993,
    longitude: 74.1240,
    locationName: 'Palolem, South Goa',
    date: '2026-07-22',
    accessType: 'shared',
    permission: 'EDITOR',
    isFavorite: false,
    lastAccessed: '3 days ago',
    owner: {
      id: 'usr-2',
      name: 'Arjun Nair',
      avatar: '📸',
      email: 'arjun@travel.io',
    },
    mediaCount: {
      photos: 36,
      videos: 9,
    },
    tags: ['Beach', 'Goa', 'Sunset', 'Scooter'],
    color: '#02a896',
    category: 'Vacation',
  },

  // --- College Symposium (as in user spec) ---
  {
    id: 'mem-symposium-1',
    title: 'College Tech Symposium',
    description: 'Presenting our geographic cloud computing architecture project and winning the university innovation cup.',
    latitude: 13.0102,
    longitude: 80.2354,
    locationName: 'Guindy, Chennai',
    date: '2026-09-02',
    accessType: 'owner',
    permission: 'OWNER',
    isFavorite: false,
    lastAccessed: '3 weeks ago',
    owner: {
      id: 'usr-1',
      name: 'Rahul Verma',
      avatar: '👨‍💻',
      email: 'rahul@memories.map',
    },
    mediaCount: {
      photos: 24,
      videos: 3,
    },
    tags: ['College', 'Tech', 'Innovation', 'Hackathon'],
    color: '#ffb72b',
    category: 'Milestone',
  },
];

export const CURRENT_USER = {
  id: 'usr-1',
  name: 'Rahul Joshva',
  handle: '@rahul',
  email: 'rahul@memories.map',
  avatar: '👨‍💻',
  role: 'Explorer',
};
