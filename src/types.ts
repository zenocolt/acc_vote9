export type CandidateType = 'star' | 'moon';

export interface Candidate {
  id: string;
  name: string;
  number: number;
  type: CandidateType;
  bio: string;
  imageUrl: string;
  votesCount: number;
}

export interface Vote {
  studentId: string;
  starId: string;
  moonId: string;
  timestamp: string;
}

export interface VoteStats {
  totalVotes: number;
  starVotes: Record<string, number>;
  moonVotes: Record<string, number>;
}

export interface AppState {
  candidates: Candidate[];
  votes: Vote[];
  votingClosed: boolean;
}
