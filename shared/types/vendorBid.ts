export type VendorBidStatus = 'pending' | 'accepted' | 'declined' | 'withdrawn';

export interface IVendorBidTerms {
  price: number;
  currency?: string;
  deliveryTime?: string;
  includesRevisions?: boolean;
  numberOfRevisions?: number;
  description?: string;
  additionalServices?: string[];
}

export interface IVendorBid {
  _id?: string;
  requirementId: string; // VendorRequirement ID
  vendorId: string; // Vendor who placed the bid
  userId: string; // Brand/Influencer who owns the requirement
  message: string;
  proposedTerms: IVendorBidTerms;
  status: VendorBidStatus;
  clientResponse?: {
    message?: string;
    respondedAt?: Date;
  };
  attachments?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

