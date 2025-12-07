/**
 * Mock email sending utility for the playground
 * In a real application, integrate with an email service like SendGrid, Mailgun, etc.
 */

export async function sendMagicCodeEmail(
  email: string,
  code: string,
  type: 'register' | 'login' | 'reset',
): Promise<void> {
  // Simulate async email sending
  await new Promise(resolve => setTimeout(resolve, 100))

  const typeLabels = {
    register: 'Registration',
    login: 'Login',
    reset: 'Password Reset',
  }

  const endpoints = {
    register: 'register-verify',
    login: 'login-verify',
    reset: 'reset-verify',
  }

  // Note: In a real application with server-side email sending,
  // you should pass the origin from the request headers or use runtime config
  const verifyLink = `/auth/password/${endpoints[type]}?code=${code}`

  console.log('\n' + '='.repeat(60))
  console.log(`📧 MOCK EMAIL - ${typeLabels[type]}`)
  console.log('='.repeat(60))
  console.log(`To: ${email}`)
  console.log(`Subject: Your ${typeLabels[type]} Verification Code`)
  console.log('')
  console.log(`Your verification code is: ${code}`)
  console.log('')
  console.log('Click the link below to verify:')
  console.log(verifyLink)
  console.log('')
  console.log('This code will expire in 10 minutes.')
  console.log('Do not share this code with anyone.')
  console.log('='.repeat(60) + '\n')

  // In a real application, you would send an actual email:
  /*
  await emailService.send({
    to: email,
    subject: `Your ${typeLabels[type]} Verification Code`,
    html: `
      <h1>${typeLabels[type]} Verification</h1>
      <p>Your verification code is:</p>
      <h2 style="font-size: 32px; letter-spacing: 8px;">${code}</h2>
      <p>Or click the button below to verify automatically:</p>
      <a href="${verifyLink}" style="display: inline-block; padding: 12px 24px; background: #2196F3; color: white; text-decoration: none; border-radius: 4px;">
        Verify ${typeLabels[type]}
      </a>
      <p>This code will expire in 10 minutes.</p>
      <p><strong>Do not share this code with anyone.</strong></p>
    `,
  })
  */
}
