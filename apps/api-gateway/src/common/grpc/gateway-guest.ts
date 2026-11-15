/** Khách vãng lai đã được IAM xác thực, gắn vào `request.guest` bởi JwtAuthGuard. */
export type GatewayGuest =
  | { readonly kind: 'GUEST_SESSION'; readonly guestSessionId: string }
  | { readonly kind: 'VERIFIED_GUEST'; readonly customerIdentityId: string };
