import { UseGuards } from '@nestjs/common';
import { Args, ID, Int, Query, Resolver } from '@nestjs/graphql';
import {
  AccessTokenGuard,
  type AuthUser,
  CurrentUser,
} from '../auth/access-token.guard';
import { ReqMeta, type RequestMeta } from '../common/request-context';
import {
  AccountModel,
  CardModel,
  HoldingModel,
  MovementPage,
  ProfileModel,
} from './accounts.models';
import { AccountsService } from './accounts.service';

/** Consultas de lectura vía GraphQL: la UI elige los campos que necesita (ADR-0006). */
@Resolver()
@UseGuards(AccessTokenGuard)
export class AccountsResolver {
  constructor(private readonly accounts: AccountsService) {}

  @Query(() => ProfileModel)
  profile(@CurrentUser() user: AuthUser): Promise<ProfileModel> {
    return this.accounts.profile(user.id);
  }

  @Query(() => [AccountModel])
  accountsList(@CurrentUser() user: AuthUser): Promise<AccountModel[]> {
    return this.accounts.accounts(user.id);
  }

  @Query(() => MovementPage)
  movements(
    @CurrentUser() user: AuthUser,
    @Args('accountId', { type: () => ID }) accountId: string,
    @Args('first', { type: () => Int, defaultValue: 20 }) first: number,
    @Args('after', { type: () => String, nullable: true })
    after?: string | null,
  ): Promise<MovementPage> {
    return this.accounts.movements(user.id, accountId, first, after);
  }

  @Query(() => [CardModel])
  cards(@CurrentUser() user: AuthUser): Promise<CardModel[]> {
    return this.accounts.cards(user.id);
  }

  @Query(() => [HoldingModel])
  holdings(@CurrentUser() user: AuthUser): Promise<HoldingModel[]> {
    return this.accounts.holdings(user.id);
  }

  @Query(() => String, {
    description: 'Número completo de la cuenta. Acción auditada.',
  })
  revealAccountNumber(
    @CurrentUser() user: AuthUser,
    @Args('accountId', { type: () => ID }) accountId: string,
    @ReqMeta() meta: RequestMeta,
  ): Promise<string> {
    return this.accounts.revealAccountNumber(user.id, accountId, meta);
  }
}
