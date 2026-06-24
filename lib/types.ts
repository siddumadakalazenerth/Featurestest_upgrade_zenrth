export type PhotoStatus = 'pending' | 'analyzed' | 'failed';
export type GateStatus = 'pending' | 'approved' | 'skipped';

export interface PhotoAnalysis {
  assetType: 'property_photo' | 'floor_plan';
  roomType: string | null;
  qualityScore: number | null;
  suitable: boolean | null;
  issues: string[];
  reasoning: string;
  emptyRoom: boolean;
  recommendation: {
    action:
      | 'none'
      | 'reupload'
      | 'photo_enhancement'
      | 'defurnishing'
      | 'smart_editing'
      | 'content_moderation'
      | 'virtual_staging';
    sellerSuggestion: string;
    editPrompt: string;
    preserve: string[];
    confidence: number | null;
  };
  floorPlan?: {
    rooms: string[];
    confidence: number | null;
    notes: string;
  };
  scoreBreakdown: {
    lighting: number | null;
    sharpness: number | null;
    composition: number | null;
    cleanliness: number | null;
    listingReadiness: number | null;
  };
  analyzedAt: string | null;
  model: string | null;
  costInr: number | null;
  costUsd: number | null;
}

export type GuidanceTool =
  | 'photo_enhancement'
  | 'defurnishing'
  | 'smart_editing'
  | 'multi_image_analysis'
  | 'floor_plan_recognition'
  | 'virtual_staging'
  | 'listing_copy'
  | 'content_moderation'
  | 'none';

export interface GuidanceAction {
  actionId: string;
  kind: 'upload' | 'reupload' | 'tool' | 'review' | 'complete';
  tool: GuidanceTool;
  priority: number;
  title: string;
  message: string;
  ctaLabel: string;
  alternateLabel: string;
  roomType: string | null;
  photoId: string | null;
  reasonCodes: string[];
}

export interface PropertyGuidance {
  readiness: 'incomplete' | 'needs_attention' | 'nearly_ready' | 'ready';
  actions: GuidanceAction[];
  assessedAt: string;
}

export interface ToolJob {
  _id: string;
  tool: Exclude<GuidanceTool, 'none'>;
  status:
    | 'queued'
    | 'processing'
    | 'ready_for_review'
    | 'accepted'
    | 'rejected'
    | 'failed';
  sourceUrl: string | null;
  resultUrl: string | null;
  resultType: 'none' | 'image' | 'report' | 'text';
  resultData: Record<string, unknown> | null;
  message: string;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface FurnishingSuggestionPiece {
  item: string;
  placement: string;
  reason: string;
}

export interface FurnishingSuggestion {
  roomType: string | null;
  estimatedDimensions: {
    widthMeters: number | null;
    lengthMeters: number | null;
    areaSqMeters: number | null;
    confidence: number | null;
    basis: string;
  };
  style: string;
  pieces: FurnishingSuggestionPiece[];
  summary: string;
  generatedAt: string | null;
  status: 'suggested' | 'accepted' | 'dismissed';
}

export interface Photo {
  _id: string;
  listing: string;
  originalName: string;
  storedFilename: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  status: PhotoStatus;
  analysis: PhotoAnalysis;
  enhancementGate: GateStatus;
  errorMessage: string | null;
  isCover: boolean;
  coverRank: number | null;
  galleryRank: number | null;
  manualCover: boolean;
  moderation: {
    status: 'not_reviewed' | 'clear' | 'needs_action' | 'removed';
    risks: string[];
    recommendedAction: string;
    explanation: string;
    reviewedAt: string | null;
  };
  furnishingSuggestion?: FurnishingSuggestion;
  createdAt: string;
  updatedAt: string;
}

export interface CostSummary {
  totalPhotos: number;
  analyzedPhotos: number;
  approvedForEnhancement: number;
  skippedByQualityGate: number;
  analysisCostInr: number;
  baselineEnhancementCostInr: number;
  filteredEnhancementCostInr: number;
  estimatedReductionPct: number;
  qualityThreshold: number;
  enhancementCostInr: number;
  analysisCostPerImageInr: number;
}

export interface Listing {
  _id: string;
  title: string;
  address: string;
  requiredRoomTypes: string[];
  propertyReview: {
    summary: string;
    warnings: string[];
    suggestions: string[];
    duplicateGroups: string[][];
    reviewedAt: string | null;
  };
  listingCopy: {
    headline: string;
    description: string;
    highlights: string[];
    factsToConfirm: string[];
    approved: boolean;
    generatedAt: string | null;
  };
  publication: {
    status: 'draft' | 'ready' | 'published';
    publishedAt: string | null;
    destination: string;
    externalReference: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PublicationChecklist {
  canPublish: boolean;
  checks: {
    key: string;
    label: string;
    complete: boolean;
    optional?: boolean;
  }[];
}

export interface WorkspaceActivity {
  usage: { units: number; costInr: number; costUsd: number; limit: number };
  events: {
    _id: string;
    action: string;
    entityType: string;
    entityId: string | null;
    metadata: Record<string, unknown>;
    createdAt: string;
  }[];
  notifications: {
    _id: string;
    type: string;
    title: string;
    message: string;
    readAt: string | null;
    createdAt: string;
  }[];
}

export interface AssetVersion {
  _id: string;
  kind: 'original' | 'generated';
  url: string;
  mimeType: string;
  selected: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ListingSummary extends Listing {
  photoCount: number;
  analyzedCount: number;
  failedCount: number;
  missingRoomTypes: string[];
  costSummary: CostSummary;
  guidance: PropertyGuidance;
}

export interface ListingDetail {
  listing: Listing;
  photos: Photo[];
  missingRoomTypes: string[];
  costSummary: CostSummary;
  guidance: PropertyGuidance;
  toolJobs: ToolJob[];
  publication: PublicationChecklist;
}
