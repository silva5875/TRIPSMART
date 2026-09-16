export interface TouristSpot {
  id: string;
  name: string;
  description: string;
  peakMonths: number[];
  rating: number;
  lat: number;
  lng: number;
  imageEmoji: string;
  imageUrl?: string;
  avgCostPerPerson?: number;
  category?: 'turismo' | 'praia' | 'trilha' | 'entretenimento' | 'cultura' | 'natureza';
}

export interface AccommodationDetail {
  id: string;
  name: string;
  address: string;
  rating: number;
  pricePerNight: number;
  safetyScore: number;
  distanceToSpots: number;
  lat: number;
  lng: number;
  type: string;
  bookingUrl?: string;
}

export interface RestaurantDetail {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  priceRange: string;
  address: string;
  lat: number;
  lng: number;
}

export interface CityData {
  id: string;
  name: string;
  description: string;
  imageEmoji: string;
  imageUrl?: string;
  lat: number;
  lng: number;
}

export interface TravelState {
  budget: number;
  budgetLabel: string;
  people: number;
  adults: number;
  children: number;
  isCouple: boolean;
  rooms: number;
  days: number;
  groupType: 'solo' | 'couple' | 'friends';
  month: number | null;
  transportToDestination: string | null;
  city: string;
  cityName: string;
  selectedSpots: TouristSpot[];
  accommodation: AccommodationDetail | null;
  localTransport: string | null;
}

export interface ItineraryDay {
  day: number;
  title: string;
  activities: { time: string; description: string; location?: string }[];
}

export interface SharedItinerary {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  budget: number;
  budget_label: string;
  people: number;
  days: number;
  group_type: string;
  month: number | null;
  transport_to_destination: string | null;
  city: string;
  city_name: string;
  selected_spots: TouristSpot[];
  accommodation: AccommodationDetail | null;
  local_transport: string | null;
  itinerary_data: ItineraryDay[] | null;
  map_data: unknown;
  rating_avg: number;
  rating_count: number;
  likes_count: number;
  created_at: string;
  updated_at: string;
  profiles?: { display_name: string | null; avatar_url: string | null } | null;
}
