import { getProducts, getProductCategories } from '@/lib/data';
import { PosClient } from './pos-client';

export default async function POSPage() {
  const products = await getProducts();
  const categories = await getProductCategories();
  
  return (
    <div className="h-full">
      <PosClient products={products} categories={categories} />
    </div>
  );
}
