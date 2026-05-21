package service

import (
	"context"
	"errors"
	"fmt"
	"net/mail"
	"net/smtp"
	"strings"
)

type SMTPConfig struct {
	Host      string
	Port      int
	Username  string
	Password  string
	FromEmail string
	FromName  string
}

type SMTPMailer struct {
	cfg SMTPConfig
}

func NewSMTPMailer(cfg SMTPConfig) *SMTPMailer {
	return &SMTPMailer{cfg: cfg}
}

func (m *SMTPMailer) SendPasswordReset(ctx context.Context, toEmail, toName, resetURL string) error {
	select {
	case <-ctx.Done():
		return ctx.Err()
	default:
	}

	if strings.TrimSpace(m.cfg.Host) == "" || strings.TrimSpace(m.cfg.FromEmail) == "" {
		return errors.New("SMTP_HOST and SMTP_FROM_EMAIL are required for password reset email")
	}

	from := mail.Address{Name: strings.TrimSpace(m.cfg.FromName), Address: strings.TrimSpace(m.cfg.FromEmail)}
	to := mail.Address{Name: strings.TrimSpace(toName), Address: strings.TrimSpace(toEmail)}
	subject := "Reset password HashBox"
	body := fmt.Sprintf(`Halo %s,

Kami menerima permintaan reset password untuk akun HashBox Anda.

Buka tautan berikut untuk membuat password baru:
%s

Tautan ini hanya berlaku sementara. Abaikan email ini jika Anda tidak meminta reset password.
`, strings.TrimSpace(toName), resetURL)

	message := strings.Join([]string{
		"From: " + from.String(),
		"To: " + to.String(),
		"Subject: " + subject,
		"MIME-Version: 1.0",
		"Content-Type: text/plain; charset=UTF-8",
		"",
		body,
	}, "\r\n")

	addr := fmt.Sprintf("%s:%d", strings.TrimSpace(m.cfg.Host), m.cfg.Port)
	var auth smtp.Auth
	if strings.TrimSpace(m.cfg.Username) != "" {
		auth = smtp.PlainAuth("", strings.TrimSpace(m.cfg.Username), m.cfg.Password, strings.TrimSpace(m.cfg.Host))
	}

	if err := smtp.SendMail(addr, auth, from.Address, []string{to.Address}, []byte(message)); err != nil {
		return fmt.Errorf("send password reset email: %w", err)
	}

	return nil
}
