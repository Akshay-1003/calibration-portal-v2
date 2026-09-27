type RegisterGaugeRouteParams = {
  inwardId: string;
  clientOrgId: string;
  inwardNo: string;
  clientOrgName: string;
  inwardDate: string;
};

export const buildRegisterGaugeRoute = ({
  inwardId,
  clientOrgId,
  inwardNo,
  clientOrgName,
  inwardDate,
}: RegisterGaugeRouteParams): string =>
  `/transactions/inward/${inwardId}/register-gauge/${clientOrgId}/${inwardNo}/${encodeURIComponent(
    clientOrgName
  )}/${encodeURIComponent(inwardDate)}`;
