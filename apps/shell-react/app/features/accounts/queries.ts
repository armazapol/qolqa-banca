import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import { graphql } from '../../generated/graphql';
import { gqlRequest } from '../../lib/api/graphql';

/** Documentos GraphQL tipados por Codegen: la UI pide solo los campos que muestra. */
const DashboardDocument = graphql(`
  query Dashboard {
    profile {
      fullName
      dailyLimitPenCents
      dailyLimitUsdCents
    }
    accountsList {
      id
      type
      currency
      alias
      numberMasked
      balanceCents
    }
    cards {
      id
      brand
      maskedPan
      expiry
      status
      accountId
    }
  }
`);

const MovementsDocument = graphql(`
  query Movements($accountId: ID!, $first: Int!, $after: String) {
    movements(accountId: $accountId, first: $first, after: $after) {
      items {
        id
        type
        amountCents
        balanceAfterCents
        description
        counterparty
        createdAt
      }
      nextCursor
    }
  }
`);

const ProfileDocument = graphql(`
  query Profile {
    profile {
      fullName
      email
      documentMasked
      dailyLimitPenCents
      dailyLimitUsdCents
    }
    cards {
      id
      brand
      maskedPan
      expiry
      status
    }
  }
`);

const RevealAccountNumberDocument = graphql(`
  query RevealAccountNumber($accountId: ID!) {
    revealAccountNumber(accountId: $accountId)
  }
`);

export const MOVEMENTS_PAGE_SIZE = 15;

/** queryOptions centraliza clave + función: misma caché desde cualquier componente. */
export const dashboardQuery = () =>
  queryOptions({
    queryKey: ['dashboard'],
    queryFn: ({ signal }) => gqlRequest(DashboardDocument, undefined, signal),
  });

export const profileQuery = () =>
  queryOptions({
    queryKey: ['profile'],
    queryFn: ({ signal }) => gqlRequest(ProfileDocument, undefined, signal),
  });

export const movementsQuery = (accountId: string) =>
  infiniteQueryOptions({
    queryKey: ['movements', accountId],
    queryFn: ({ pageParam, signal }) =>
      gqlRequest(
        MovementsDocument,
        { accountId, first: MOVEMENTS_PAGE_SIZE, after: pageParam },
        signal,
      ).then((result) => result.movements),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

/** Sin caché a propósito: el número completo no debe quedar en memoria. */
export function revealAccountNumber(accountId: string): Promise<string> {
  return gqlRequest(RevealAccountNumberDocument, { accountId }).then(
    (result) => result.revealAccountNumber,
  );
}
