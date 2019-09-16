/**
 * Interface des services pour les contacts
 * @interface
 */
import { Promise } from "hornet-js-utils/src/promise-api";
export interface ContactService {
    envoyer(data): Promise<any>;
}
