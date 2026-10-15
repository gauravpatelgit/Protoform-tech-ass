export interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  bio: string | null;
  company: string | null;
  location: string | null;
  blog: string | null;
  html_url: string;
  avatar_url: string;
  followers: number;
  following: number;
  public_repos: number;
  created_at: string | null;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  fork: boolean;
  archived: boolean;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  language: string | null;
  pushed_at: string | null;
  created_at: string | null;
}

export interface GitHubCommit {
  commit: { author: { date: string } | null };
}

export interface GitHubResult<T> {
  notModified: boolean;
  data: T | null;
  etag: string | null;
}
