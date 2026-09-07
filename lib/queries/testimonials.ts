import { supabase } from "@/lib/supabase";
import { Testimonial } from "@/types/testimonial";

type TestimonialRow = {
  id: string;
  quote: string;
  studio_name: string;
  city: string;
};

export async function getAllTestimonials(): Promise<Testimonial[]> {
  const { data, error } = await supabase
    .from("testimonials")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data as TestimonialRow[]).map((row) => ({
    id: row.id,
    quote: row.quote,
    studioName: row.studio_name,
    city: row.city,
  }));
}
