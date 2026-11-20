-- NaN passes `amount >= 0` in Postgres, and a single NaN row turns a currency's totals and exports into NaN.
alter table public.documents
  add constraint documents_amount_not_nan check (amount <> 'NaN'),
  add constraint documents_tax_amount_not_nan check (tax_amount <> 'NaN');
