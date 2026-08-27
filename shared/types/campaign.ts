import {CampaignStatus, CampaignType, CompensationType, DeliverableType} from "../enums/enums";
import {IUser} from "./user";

export interface IDeliverable {
    type: DeliverableType;
    quantity: number;
    description?: string;
}

export interface ILocation {
    address?: string;
    latitude?: number;
    longitude?: number;
}

export interface IBid<T = string> {
    _id: T;
    influencerId?: string;
    amount?: string;
    campaign?: ICampaign;
    influencer: IUser;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ICampaign<T = string> {
    _id: T;
    name: string;
    image?: string;
    type: CampaignType;
    compensationType: CompensationType;
    status: CampaignStatus;
    budget?: number;
    startDate: Date;
    endDate: Date;
    minBid?: number;
    targetEngagement?: number;
    description?: string;
    barterDetails?: string;
    locations?: ILocation[];
    deliverables?: IDeliverable[];
    createdAt?: Date;
    updatedAt?: Date;
}