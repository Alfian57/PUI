package repository

import (
	"regexp"
	"testing"
)

func TestCreatePendingReturningColumnsDoNotUseTableAlias(t *testing.T) {
	t.Parallel()

	tableAlias := regexp.MustCompile(`\bf\.`)
	if tableAlias.MatchString(fileReturningColumns) {
		t.Fatalf("insert returning columns must not reference table alias f.")
	}
}
