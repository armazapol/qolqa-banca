import { Field, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import {
  AccountType,
  CardBrand,
  CardStatus,
  Currency,
  MovementType,
} from '../generated/prisma/enums';

registerEnumType(Currency, { name: 'Currency' });
registerEnumType(AccountType, { name: 'AccountType' });
registerEnumType(MovementType, { name: 'MovementType' });
registerEnumType(CardBrand, { name: 'CardBrand' });
registerEnumType(CardStatus, { name: 'CardStatus' });

@ObjectType({
  description:
    'Cuenta bancaria. El número completo solo se obtiene con revealAccountNumber.',
})
export class AccountModel {
  @Field(() => ID) id!: string;
  @Field(() => AccountType) type!: AccountType;
  @Field(() => Currency) currency!: Currency;
  @Field() alias!: string;
  @Field() numberMasked!: string;
  @Field(() => Int, { description: 'Saldo en céntimos' }) balanceCents!: number;
}

@ObjectType()
export class MovementModel {
  @Field(() => ID) id!: string;
  @Field(() => MovementType) type!: MovementType;
  @Field(() => Int) amountCents!: number;
  @Field(() => Int) balanceAfterCents!: number;
  @Field() description!: string;
  @Field(() => String, { nullable: true }) counterparty!: string | null;
  @Field() createdAt!: Date;
}

@ObjectType({ description: 'Página de movimientos con paginación por cursor' })
export class MovementPage {
  @Field(() => [MovementModel]) items!: MovementModel[];
  @Field(() => String, { nullable: true }) nextCursor!: string | null;
}

@ObjectType({ description: 'Tarjeta: solo BIN y últimos 4 dígitos (PCI DSS)' })
export class CardModel {
  @Field(() => ID) id!: string;
  @Field(() => CardBrand) brand!: CardBrand;
  @Field() maskedPan!: string;
  @Field() expiry!: string;
  @Field(() => CardStatus) status!: CardStatus;
  @Field(() => ID) accountId!: string;
}

@ObjectType({
  description:
    'Posición de inversión. Decimales como texto para no perder precisión.',
})
export class HoldingModel {
  @Field(() => ID) id!: string;
  @Field() symbol!: string;
  @Field() name!: string;
  @Field() quantity!: string;
  @Field() avgPriceUsd!: string;
}

@ObjectType()
export class ProfileModel {
  @Field(() => ID) id!: string;
  @Field() fullName!: string;
  @Field() email!: string;
  @Field() documentMasked!: string;
  @Field(() => Int) dailyLimitPenCents!: number;
  @Field(() => Int) dailyLimitUsdCents!: number;
}
