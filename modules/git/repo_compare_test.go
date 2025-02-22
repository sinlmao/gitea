// Copyright 2018 The Gitea Authors. All rights reserved.
// Use of this source code is governed by a MIT-style
// license that can be found in the LICENSE file.

package git

import (
	"bytes"
	"io"
	"path/filepath"
	"testing"

	"code.gitea.io/gitea/modules/util"

	"github.com/stretchr/testify/assert"
)

func TestGetFormatPatch(t *testing.T) {
	bareRepo1Path := filepath.Join(testReposDir, "repo1_bare")
	clonedPath, err := cloneRepo(bareRepo1Path, testReposDir, "repo1_TestGetFormatPatch")
	defer util.RemoveAll(clonedPath)
	assert.NoError(t, err)
	repo, err := OpenRepository(clonedPath)
	defer repo.Close()
	assert.NoError(t, err)
	rd := &bytes.Buffer{}
	err = repo.GetPatch("8d92fc95^", "8d92fc95", rd)
	assert.NoError(t, err)
	patchb, err := io.ReadAll(rd)
	assert.NoError(t, err)
	patch := string(patchb)
	assert.Regexp(t, "^From 8d92fc95", patch)
	assert.Contains(t, patch, "Subject: [PATCH] Add file2.txt")
}

func TestReadPatch(t *testing.T) {
	// Ensure we can read the patch files
	bareRepo1Path := filepath.Join(testReposDir, "repo1_bare")
	repo, err := OpenRepository(bareRepo1Path)
	defer repo.Close()
	assert.NoError(t, err)
	// This patch doesn't exist
	noFile, err := repo.ReadPatchCommit(0)
	assert.Error(t, err)
	// This patch is an empty one (sometimes it's a 404)
	noCommit, err := repo.ReadPatchCommit(1)
	assert.Error(t, err)
	// This patch is legit and should return a commit
	oldCommit, err := repo.ReadPatchCommit(2)
	assert.NoError(t, err)

	assert.Empty(t, noFile)
	assert.Empty(t, noCommit)
	assert.Len(t, oldCommit, 40)
	assert.True(t, oldCommit == "6e8e2a6f9efd71dbe6917816343ed8415ad696c3")
}

func TestReadWritePullHead(t *testing.T) {
	// Ensure we can write SHA1 head corresponding to PR and open them
	bareRepo1Path := filepath.Join(testReposDir, "repo1_bare")
	repo, err := OpenRepository(bareRepo1Path)
	assert.NoError(t, err)
	defer repo.Close()
	// Try to open non-existing Pull
	_, err = repo.GetRefCommitID(PullPrefix + "0/head")
	assert.Error(t, err)
	// Write a fake sha1 with only 40 zeros
	newCommit := "feaf4ba6bc635fec442f46ddd4512416ec43c2c2"
	err = repo.SetReference(PullPrefix+"1/head", newCommit)
	assert.NoError(t, err)
	// Remove file after the test
	defer func() {
		_ = repo.RemoveReference(PullPrefix + "1/head")
	}()
	// Read the file created
	headContents, err := repo.GetRefCommitID(PullPrefix + "1/head")
	assert.NoError(t, err)
	assert.Len(t, string(headContents), 40)
	assert.True(t, string(headContents) == newCommit)
}
