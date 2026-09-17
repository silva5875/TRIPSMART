/** Chaves de cache do React Query, em um lugar só para invalidação não errar o alvo. */
export const queryKeys = {
  travelHistory: (userId: string) => ['travel-history', userId] as const,

  profile: (userId: string) => ['profile', userId] as const,
  profileStats: (userId: string) => ['profile-stats', userId] as const,
  myBirthDate: (userId: string) => ['my-birth-date', userId] as const,

  preferences: (userId: string) => ['preferences', userId] as const,
  plannerProgress: (userId: string) => ['planner-progress', userId] as const,

  communityFeed: ['community-feed'] as const,
  communityComments: (itineraryId: string) => ['community-comments', itineraryId] as const,
  myItineraryReactions: (userId: string) => ['my-itinerary-reactions', userId] as const,

  activityRatings: (cityId: string) => ['activity-ratings', cityId] as const,
  accommodationRatings: (cityId: string) => ['accommodation-ratings', cityId] as const,
  myActivityReviews: (userId: string, cityId: string) =>
    ['my-activity-reviews', userId, cityId] as const,
  myAccommodationReviews: (userId: string, cityId: string) =>
    ['my-accommodation-reviews', userId, cityId] as const,

  touristSpots: (cityId: string, params: string) => ['tourist-spots', cityId, params] as const,
  accommodations: (cityId: string, params: string) => ['accommodations', cityId, params] as const,

  isAdmin: (userId: string) => ['is-admin', userId] as const,
  deletedRecords: ['deleted-records'] as const,
  adminUsers: ['admin-users'] as const,
  adminOverview: ['admin-overview'] as const,
  adminActivitySeries: (days: number) => ['admin-activity-series', days] as const,

  adminTrafficOverview: (days: number) => ['admin-traffic-overview', days] as const,
  adminTrafficSeries: (days: number) => ['admin-traffic-series', days] as const,
  // `limit` faz parte da chave: dois componentes que pedissem o mesmo
  // `days` com `limit` diferente compartilhariam cache errado sem isso.
  adminTopPages: (days: number, limit: number) => ['admin-top-pages', days, limit] as const,
  adminTopReferrers: (days: number, limit: number) => ['admin-top-referrers', days, limit] as const,
  adminDayTraffic: (day: string) => ['admin-day-traffic', day] as const,

  adminTravelHistory: (limit: number) => ['admin-travel-history', limit] as const,
  adminSharedItineraries: (limit: number) => ['admin-shared-itineraries', limit] as const,
  adminComments: (limit: number) => ['admin-comments', limit] as const,
  adminLikes: (limit: number) => ['admin-likes', limit] as const,
  adminReviews: (limit: number) => ['admin-reviews', limit] as const,
  adminPlannerFunnel: ['admin-planner-funnel'] as const,
  adminPlannerStuckUsers: ['admin-planner-stuck-users'] as const,
} as const;
