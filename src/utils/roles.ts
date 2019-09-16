/**
 * Classe regroupant les rôles disponibles dans l'application
 */
export class Roles {
    static USER_STR = "tYo_USER";
    static ADMIN_STR = "tYo_ADMIN";

    static USER = [Roles.USER_STR];
    static ADMIN = [Roles.ADMIN_STR];

    static EVERYONE = [Roles.USER_STR, Roles.ADMIN_STR];
}
