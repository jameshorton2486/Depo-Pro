// ═══════════════════════════════════════════════════════════════
// CONTACT PAGE - Use Case Dropdown
// ═══════════════════════════════════════════════════════════════

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PublicHeader } from '@/components/layouts/public-header';
import { PublicFooter } from '@/components/layouts/public-footer';
import { Mail, Phone, Send } from 'lucide-react';

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [useCase, setUseCase] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    // TODO: Implement actual contact form submission
    // For now, just simulate success
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <PublicHeader />

      {/* Hero */}
      <section className="pt-32 pb-16 lg:pt-40 lg:pb-24">
        <div className="container mx-auto px-4 lg:px-6 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-[52px] font-bold text-[var(--color-primary)] mb-6 leading-[1.1] max-w-4xl mx-auto">
            Get in Touch
          </h1>
          <p className="text-lg md:text-xl text-[var(--color-text-secondary)] max-w-3xl mx-auto leading-relaxed mb-4">
            Have questions about Depo-Pro? We&apos;d love to hear from you.
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">
            We respond within one business day.
          </p>
        </div>
      </section>

      {/* Contact Form & Info */}
      <section className="py-16 lg:py-24 bg-[var(--color-surface)]">
        <div className="container mx-auto px-4 lg:px-6 max-w-6xl">
          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            {/* Contact Form */}
            <Card className="border-[var(--color-border)] shadow-[var(--shadow-soft)]">
              <CardHeader>
                <CardTitle className="text-[var(--color-primary)]">Send us a Message</CardTitle>
              </CardHeader>
              <CardContent>
                {submitted ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-[var(--color-success)]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Send className="w-8 h-8 text-[var(--color-success)]" />
                    </div>
                    <h3 className="text-xl font-semibold text-[var(--color-primary)] mb-2">Message Sent!</h3>
                    <p className="text-[var(--color-text-secondary)]">
                      Thank you for contacting us. We&apos;ll get back to you within one business day.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" name="name" required className="border-[var(--color-border)]" />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" name="email" required className="border-[var(--color-border)]" />
                    </div>
                    <div>
                      <Label htmlFor="useCase">Use Case</Label>
                      <Select value={useCase} onValueChange={setUseCase} required>
                        <SelectTrigger className="border-[var(--color-border)]">
                          <SelectValue placeholder="Select a use case" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sales">Sales</SelectItem>
                          <SelectItem value="support">Support</SelectItem>
                          <SelectItem value="security">Security</SelectItem>
                          <SelectItem value="billing">Billing</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="subject">Subject</Label>
                      <Input id="subject" name="subject" required className="border-[var(--color-border)]" />
                    </div>
                    <div>
                      <Label htmlFor="message">Message</Label>
                      <Textarea
                        id="message"
                        name="message"
                        rows={6}
                        required
                        className="border-[var(--color-border)]"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90 text-white rounded-[var(--radius-button)]"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Sending...' : 'Send Message'}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>

            {/* Contact Info */}
            <div className="space-y-6">
              <Card className="border-[var(--color-border)] shadow-[var(--shadow-soft)]">
                <CardHeader>
                  <CardTitle className="text-[var(--color-primary)]">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-[var(--color-accent)]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Mail className="w-5 h-5 text-[var(--color-accent)]" />
                    </div>
                    <div>
                      <p className="font-medium text-[var(--color-primary)] mb-1">Email</p>
                      <a
                        href="mailto:support@depo-pro.com"
                        className="text-[var(--color-accent)] hover:underline text-sm"
                      >
                        support@depo-pro.com
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-[var(--color-accent)]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Phone className="w-5 h-5 text-[var(--color-accent)]" />
                    </div>
                    <div>
                      <p className="font-medium text-[var(--color-primary)] mb-1">Phone</p>
                      <a href="tel:+1-555-123-4567" className="text-[var(--color-accent)] hover:underline text-sm">
                        (555) 123-4567
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-[var(--color-border)] shadow-[var(--shadow-soft)]">
                <CardHeader>
                  <CardTitle className="text-[var(--color-primary)]">Business Hours</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium text-[var(--color-primary)]">Monday - Friday</span>
                      <span className="text-[var(--color-text-secondary)]">9:00 AM - 6:00 PM PST</span>
                    </div>
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] mt-4">
                    We respond within one business day.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
