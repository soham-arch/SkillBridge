'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Clock, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/auth/auth-context';
import { createService } from '@/lib/services/services';
import { getCategories } from '@/lib/services/categories';
import type { Category, ServiceStatus } from '@/types';

export default function CreateServicePage() {
  const { session } = useAuth();
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [extractingSkills, setExtractingSkills] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [deliveryDays, setDeliveryDays] = useState('3');
  const [location, setLocation] = useState('Online / Pune');
  const [categoryId, setCategoryId] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [status, setStatus] = useState<ServiceStatus>('published');

  useEffect(() => {
    getCategories().then(setCategories).catch(console.error);
  }, []);

  async function handleAIExtractSkills() {
    if (!title.trim() && !description.trim()) {
      toast.error('Please enter a title or description first to analyze.');
      return;
    }

    setExtractingSkills(true);
    try {
      const res = await fetch('/api/ai/extract-skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.skills && data.skills.length > 0) {
          const combined = Array.from(new Set([...skills, ...data.skills]));
          setSkills(combined);
          toast.success(`AI suggested ${data.skills.length} skills based on your description!`);
        }
      }
    } catch {
      toast.error('AI assistant unavailable, please add skills manually.');
    } finally {
      setExtractingSkills(false);
    }
  }

  function handleAddSkill() {
    if (!skillInput.trim()) return;
    if (!skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()]);
    }
    setSkillInput('');
  }

  function handleRemoveSkill(skillToRemove: string) {
    setSkills(skills.filter((s) => s !== skillToRemove));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const userId = session?.user?.id ?? '10000000-0000-0000-0000-000000000001'; // Alex Sharma by default for test
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      toast.error('Please enter a valid price.');
      return;
    }

    setSubmitting(true);
    try {
      await createService({
        provider_id: userId,
        title: title.trim(),
        description: description.trim(),
        price: parsedPrice,
        delivery_days: parseInt(deliveryDays) || 3,
        location: location.trim(),
        category_id: categoryId || null,
        skills,
        tags: skills,
        status,
      });

      toast.success(
        status === 'published'
          ? 'Service published! Students can now discover and order it.'
          : 'Service saved as draft.'
      );
      router.push('/my-services');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create service.';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      {/* Heading */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Offer Your Skill</h1>
        <p className="mt-1 text-sm text-gray-600">
          Create a student service listing to monetize your talent on campus.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-white p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Title */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="title" className="text-sm font-semibold text-gray-900">
              Service Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Modern React & Next.js Website Development"
              className="h-12 text-sm"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="description" className="text-sm font-semibold text-gray-900">
                Service Description <span className="text-red-500">*</span>
              </Label>
              <button
                type="button"
                onClick={handleAIExtractSkills}
                disabled={extractingSkills}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#004ac6] hover:underline disabled:opacity-60"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {extractingSkills ? 'Analyzing...' : 'AI Suggest Tags'}
              </button>
            </div>
            <Textarea
              id="description"
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your service scope, what the client will receive, tools used (e.g. Figma, Next.js), and requirements..."
              className="resize-none text-sm"
            />
          </div>

          {/* Skills / Tags */}
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-semibold text-gray-900">Relevant Skills & Tags</Label>
            <div className="flex gap-2">
              <Input
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSkill();
                  }
                }}
                placeholder="Add a skill tag (e.g. Tailwind CSS, Python)..."
                className="h-10 text-xs"
              />
              <Button
                type="button"
                onClick={handleAddSkill}
                variant="outline"
                className="border-gray-200 text-xs"
              >
                Add
              </Button>
            </div>

            {skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-[#004ac6]"
                  >
                    #{skill}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="ml-1 text-blue-400 hover:text-blue-700"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Price + Delivery Days */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="price" className="text-sm font-semibold text-gray-900">
                Price (₹) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="price"
                type="number"
                required
                min={0}
                step={1}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 1500"
                className="h-12 text-sm"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="deliveryDays" className="text-sm font-semibold text-gray-900">
                Delivery Time (Days)
              </Label>
              <Input
                id="deliveryDays"
                type="number"
                min={1}
                max={30}
                value={deliveryDays}
                onChange={(e) => setDeliveryDays(e.target.value)}
                placeholder="3"
                className="h-12 text-sm"
              />
            </div>
          </div>

          {/* Category + Location */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="category" className="text-sm font-semibold text-gray-900">
                Category
              </Label>
              <select
                id="category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="h-12 rounded-lg border border-[#c3c6d7] bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#004ac6]"
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="location" className="text-sm font-semibold text-gray-900">
                Location / Delivery Mode
              </Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Online / Remote"
                className="h-12 text-sm"
              />
            </div>
          </div>

          {/* Visibility */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="status" className="text-sm font-semibold text-gray-900">
              Visibility
            </Label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as ServiceStatus)}
              className="h-12 rounded-lg border border-[#c3c6d7] bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#004ac6]"
            >
              <option value="published">Published — Visible in search & discoverable</option>
              <option value="draft">Draft — Only you can see it</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="flex-1 border-gray-200"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-[#004ac6] text-white hover:bg-[#003b9e] font-bold"
            >
              {submitting ? 'Publishing...' : 'Publish Service Listing'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
