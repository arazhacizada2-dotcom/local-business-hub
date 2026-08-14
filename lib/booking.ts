export interface BookableService {
  business_id: string;
  is_active: boolean;
}

export function isBookableServiceForBusiness(
  service: BookableService | null,
  businessId: string
): boolean {
  return Boolean(service && service.business_id === businessId && service.is_active);
}
