// GitHub login rules: 1-39 chars, alphanumeric or single hyphens, no leading/trailing hyphen.
const USERNAME_PATTERN = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i

export function isValidGithubUsername(value: string) {
  return USERNAME_PATTERN.test(value)
}
