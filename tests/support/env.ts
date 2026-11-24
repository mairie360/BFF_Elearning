import { useSessionPublicKey } from './session-keys';

// Every test app verifies the session tokens with Core's public key, the fixtures sign them like Core (EdDSA,
// MAIR-680), and no JWT_SECRET is set: HS256 tokens are refused, as by bffs-lib >= 3 in every deployment.
useSessionPublicKey();
