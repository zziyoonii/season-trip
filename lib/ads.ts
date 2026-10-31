/** AdSense 게시자 ID (공개값). 로컬 개발에서는 안 붙여요 */
export const ADS_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || (process.env.NODE_ENV === "production" ? "ca-pub-8044778231088788" : undefined);
/** 광고 단위 ID: 승인 후 AdSense에서 만들어 NEXT_PUBLIC_ADSENSE_SLOT 에 넣으면 광고 칸이 보여요 */
export const ADS_SLOT = process.env.NEXT_PUBLIC_ADSENSE_SLOT;
