export interface Listing {
  id: number;
  district: string;
  po: string;
  road: string;
  landmark: string;
  price: string;
  priceNum: number;
  negotiable: boolean;
  mobile: string;
  hasVideo: boolean;
  videoData?: string | null;
  photos: string[];
  size: string;
  unit: string;
  type: string;
  facing: string;
  maps: string;
  verified: boolean;
  sold: boolean;
  soldAt?: number | null;
  specialRemarks?: string;
}

export interface RegisteredBuyer {
  mobile: string;
  district: string;
  area?: string;
  date: string;
}

export interface BuyerLead {
  mobile: string;
  po: string;
  district: string;
  budget: string;
  type: string;
  remarks: string;
  date: string;
  source: string;
  }

export interface RecentSearch {
  id: string;
  timestamp: number;
  query: string;
  filterDistrict: string;
  filterType: string;
  filterPrice: string;
  filterStatus: string;
}
