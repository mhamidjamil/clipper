
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Header } from '@/components/Header';
import { Loader2, PlusCircle, Trash2, Edit, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ServiceCategory } from '@/lib/types';

export default function CategoriesPage() {
  const { user, userProfile, loading, db } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDuration, setNewCategoryDuration] = useState('');
  const [newCategoryPrice, setNewCategoryPrice] = useState('');

  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [editingCategoryDuration, setEditingCategoryDuration] = useState('');
  const [editingCategoryPrice, setEditingCategoryPrice] = useState('');

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (userProfile?.role !== 'barber') {
        router.push('/');
      } else {
        setIsPageLoading(false);
      }
    }
  }, [user, userProfile, loading, router]);

  useEffect(() => {
    if (!db || !user) return;

    const q = query(collection(db, 'services'), where('barberId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const servicesData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ServiceCategory[];
      setCategories(servicesData);
    });

    return () => unsubscribe();
  }, [db, user]);

  const handleAddCategory = async () => {
    if (!db || !user || !newCategoryName || !newCategoryDuration || !newCategoryPrice) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please fill out all fields for the new category.',
      });
      return;
    }
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'services'), {
        barberId: user.uid,
        name: newCategoryName,
        duration: Number(newCategoryDuration),
        price: Number(newCategoryPrice),
        createdAt: serverTimestamp(),
      });
      setNewCategoryName('');
      setNewCategoryDuration('');
      setNewCategoryPrice('');
      toast({
        title: 'Success!',
        description: 'New service category added.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error adding category',
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateCategory = async (categoryId: string) => {
    if (!db) return;
    setIsSubmitting(true);
    try {
      const categoryRef = doc(db, 'services', categoryId);
      await updateDoc(categoryRef, {
        name: editingCategoryName,
        duration: Number(editingCategoryDuration),
        price: Number(editingCategoryPrice),
      });
      setEditingCategoryId(null);
      toast({
        title: 'Success!',
        description: 'Service category updated.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error updating category',
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, 'services', categoryId));
      toast({
        title: 'Success!',
        description: 'Service category deleted.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error deleting category',
        description: error.message,
      });
    }
  };
  
  const startEditing = (category: ServiceCategory) => {
    setEditingCategoryId(category.id);
    setEditingCategoryName(category.name);
    setEditingCategoryDuration(String(category.duration));
    setEditingCategoryPrice(String(category.price));
  };

  if (loading || isPageLoading || userProfile?.role !== 'barber') {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-4xl p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Manage Your Services</CardTitle>
            <CardDescription>
              Add, update, or remove the services you offer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category Name</TableHead>
                  <TableHead>Time (minutes)</TableHead>
                  <TableHead>Price (PKR)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    {editingCategoryId === category.id ? (
                      <>
                        <TableCell>
                          <Input
                            value={editingCategoryName}
                            onChange={(e) => setEditingCategoryName(e.target.value)}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={editingCategoryDuration}
                            onChange={(e) => setEditingCategoryDuration(e.target.value)}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={editingCategoryPrice}
                            onChange={(e) => setEditingCategoryPrice(e.target.value)}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="icon" variant="outline" className="mr-2 h-8 w-8" onClick={() => handleUpdateCategory(category.id)} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingCategoryId(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="font-medium">{category.name}</TableCell>
                        <TableCell>{category.duration}</TableCell>
                        <TableCell>{category.price}</TableCell>
                        <TableCell className="text-right">
                          <Button size="icon" variant="ghost" className="mr-2 h-8 w-8" onClick={() => startEditing(category)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="destructive" className="h-8 w-8" onClick={() => handleDeleteCategory(category.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell>
                    <Input
                      placeholder="e.g., Haircut"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="h-9"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      placeholder="e.g., 30"
                      value={newCategoryDuration}
                      onChange={(e) => setNewCategoryDuration(e.target.value)}
                       className="h-9"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      placeholder="e.g., 1000"
                      value={newCategoryPrice}
                      onChange={(e) => setNewCategoryPrice(e.target.value)}
                       className="h-9"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button onClick={handleAddCategory} disabled={isSubmitting} size="sm">
                       {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                      Add
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
