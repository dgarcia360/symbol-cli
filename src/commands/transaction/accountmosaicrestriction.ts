/*
 *
 * Copyright 2018-present NEM
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
import {command, metadata, option} from 'clime';
import {AccountRestrictionModification, AccountRestrictionTransaction, Deadline, MosaicId, UInt64} from 'nem2-sdk';
import {AnnounceTransactionsCommand, AnnounceTransactionsOptions} from '../../announce.transactions.command';
import {OptionsResolver} from '../../options-resolver';
import {RestrictionService} from '../../service/restriction.service';
import {BinaryValidator} from '../../validators/binary.validator';
import {MosaicIdValidator} from '../../validators/mosaicId.validator';
import {
    AccountRestrictionDirectionValidator,
    AccountRestrictionTypeValidator,
} from '../../validators/restrictionType.validator';

export class CommandOptions extends AnnounceTransactionsOptions {
    @option({
        flag: 't',
        description: 'Restriction type (allow, block).',
        validator: new AccountRestrictionTypeValidator(),
    })
    restrictionType: string;

    @option({
        flag: 'd',
        description: 'Restriction direction (incoming, outgoing).',
        validator: new AccountRestrictionDirectionValidator(),
    })
    restrictionDirection: string;

    @option({
        flag: 'a',
        description: 'Modification action. (1: Add, 0: Remove).',
        validator: new BinaryValidator(),
    })
    modificationAction: number;

    @option({
        flag: 'v',
        description: 'Mosaic to allow / block.',
        validator: new MosaicIdValidator(),
    })
    value: string;
}

@command({
    description: 'Allow or block incoming transactions containing a given set of mosaics',
})
export default class extends AnnounceTransactionsCommand {
    private readonly restrictionService: RestrictionService;

    constructor() {
        super();
        this.restrictionService = new RestrictionService();
    }

    @metadata
    execute(options: CommandOptions) {
        options.restrictionType = OptionsResolver(options,
            'restrictionType',
            () => undefined,
            'Introduce the restriction type (allow, block):');

        options.modificationAction = +OptionsResolver(options,
            'modificationAction',
            () => undefined,
            'Introduce the modification action (1: Add, 0: Remove): ');

        options.restrictionDirection = OptionsResolver(options,
            'restrictionDirection',
            () => undefined,
            'Introduce the restriction direction (incoming, outgoing): ');

        options.value = OptionsResolver(options,
            'value',
            () => undefined,
            'Introduce the mosaic identifier: ');

        options.maxFee = OptionsResolver(options,
            'maxFee',
            () => undefined,
            'Introduce the maximum fee you want to spend to announce the transaction: ');

        const profile = this.getProfile(options);
        const mosaic = new MosaicId(options.value);

        const mosaicRestriction = AccountRestrictionModification.createForMosaic(options.modificationAction, mosaic);
        const transaction = AccountRestrictionTransaction.createMosaicRestrictionModificationTransaction(
            Deadline.create(),
            this.restrictionService.getAccountMosaicRestrictionType(options.restrictionType),
            [mosaicRestriction],
            profile.networkType,
            options.maxFee ? UInt64.fromNumericString(options.maxFee) : UInt64.fromUint(0));

        const signedTransaction = profile.account.sign(transaction, profile.networkGenerationHash);
        this.announceTransaction(signedTransaction, profile.url);
    }
}