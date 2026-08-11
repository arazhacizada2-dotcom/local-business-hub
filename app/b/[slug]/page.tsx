export default async function PublicBusinessPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const supabase = createClient();

  const { data: business } = await supabase
    .from("businesses_public")
    .select(PUBLIC_BUSINESS_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();

  if (!business) notFound();

  // ...
}
