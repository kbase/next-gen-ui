import type { Ident } from './schemas';

// auth2 names the provider `OrcID`.
export function findOrcid(idents: Ident[] | undefined): Ident | undefined {
  return idents?.find((i) => i.provider && /orcid/i.test(i.provider));
}
